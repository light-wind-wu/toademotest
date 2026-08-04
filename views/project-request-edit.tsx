'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Info,
  Minus,
  Paperclip,
  Plus,
  Save,
  Send,
  Trash2,
  X,
  ArrowLeftToLine,
  Users,
  ArrowUp,
} from 'lucide-react';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import DatePicker from '@/components/ui-legacy/date-picker';
import { DateRangePicker, type DateRange } from '@/components/date-range-picker';
import { parseMMMYY, MONTHS, periodLabelToMMMYY, mmmyyToISO, mmmyyToISOEnd, INTAKE_BASE_YEAR, DEFAULT_INTAKE_YEAR, INTAKE_YEARS, shiftMMMYY, toMonthIndex, INTERNSHIP_WINDOWS } from '@/lib/internship-period';
import { parseISO, formatISO } from 'date-fns';
import Combobox from '@/components/ui-legacy/combobox';
import Drawer from '@/components/ui-legacy/drawer';
import EmptyState from '@/components/ui-legacy/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui-legacy/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { downloadRequestTemplateXLSX } from '@/lib/request-template';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CONTACTS, toEducationLevel } from '@/lib/data';
import { addNotification } from '@/lib/notifications';
import { useRole, ROLE_PROFILES } from '@/lib/role';
import {
  loadRequestAuditLogs,
  loadRequests,
  saveRequestAuditLogs,
  saveRequests,
} from '@/lib/storage';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { cn, formatDate, sgTomorrow } from '@/lib/utils';
import { Field, FieldLabel, FieldLabelText } from '@/components/ui-legacy/field';
import FieldRequired from '@/components/ui-legacy/field-required';
import type {
  ProjectRequest,
  ProjectRequestAuditEntry,
  RequestStatus,
} from '@/lib/types';

const INTERN_CATEGORIES = [
  'Undergraduate Scholar/Merit Scholar',
  'Tech UP',
  'Undergraduate Student',
  'Junior College Scholar/Junior College Student',
  'Polytechnic Scholar/Polytechnic Student',
  'Post Junior College/Post Polytechnic Student',
  'Young Defence Scientist Programme',
] as const;
const DURATIONS = ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months', '12 Months'] as const;
const AUTO_REMINDER_DAYS = [14, 7];
const MISSING_CHECK_HELP = 'Missing required fields: Programme Centre, Response deadline, and Placement requirements.';

/** "Jun26" → "Jun 2026". */
function mmmyyLabel(mmmyy: string): string {
  const idx = parseMMMYY(mmmyy);
  if (idx === null) return '';
  return `${MONTHS[((idx % 12) + 12) % 12]} ${Math.floor(idx / 12)}`;
}
/** Coerce a stored window value (ISO day or legacy MMMYY) to an ISO day; isEnd picks the last day of a MMMYY month. */
function isoDay(v: string, isEnd = false): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return isEnd ? mmmyyToISOEnd(v) : mmmyyToISO(v);
}
/** Window label from ISO days ("1 Jun 2026 – 20 Aug 2026"; single day when start === end). Falls back to MMMYY. */
function monthRangeLabel(start: string, end: string): string {
  if (!start || !end) return '';
  const si = start.match(/^(\d{4})-(\d{2})-(\d{2})$/), ei = end.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (si && ei) {
    const dayName = (m: RegExpMatchArray) => `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
    const s = dayName(si), e = dayName(ei);
    return s === e ? s : `${s} – ${e}`;
  }
  const s = mmmyyLabel(start), e = mmmyyLabel(end);
  return s === e ? s : `${s} – ${e}`;
}
/** Reconstruct MMMYY start/end from a saved "Jun 2026 – Dec 2026" label. */
function parseCalendarPeriod(label: string): { start: string; end: string } {
  if (!label) return { start: '', end: '' };
  const [a, b] = label.split(/\s+–\s+|\s+-\s+/);
  const start = periodLabelToMMMYY(a ?? '');
  const end = periodLabelToMMMYY(b ?? a ?? '');
  return { start, end };
}

/** Shift an ISO day ("2026-06-01") by whole years, clamping the day to the month. */
function shiftIsoYears(iso: string, years: number): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const y = parseInt(m[1], 10) + years;
  const day = Math.min(parseInt(m[3], 10), new Date(y, parseInt(m[2], 10), 0).getDate());
  return `${y}-${m[2]}-${String(day).padStart(2, '0')}`;
}

function intakeYearFromPeriodStart(periodStart?: string): number {
  const idx = toMonthIndex(periodStart);
  return idx === null ? DEFAULT_INTAKE_YEAR : Math.floor(idx / 12);
}

function windowPresetsForCategory(category: string, year: number): Array<{ start: string; end: string }> {
  const yearShift = year - INTAKE_BASE_YEAR;
  return (INTERNSHIP_WINDOWS[category] || []).map(p => ({
    start: mmmyyToISO(shiftMMMYY(p.start, yearShift)),
    end: mmmyyToISOEnd(shiftMMMYY(p.end, yearShift)),
  }));
}

function isPresetWindow(category: string, start: string, end: string, year: number): boolean {
  return windowPresetsForCategory(category, year).some(p => p.start === start && p.end === end);
}

type RequestMode = 'draft' | 'open';
type DisplayRequestStatus = 'draft' | 'pending' | 'incomplete' | 'fulfilled' | 'closed';

/* Single title pill per request status (matches the Project Requests list). */
const STATUS_PILL: Record<DisplayRequestStatus, { label: string; variant: 'status-draft' | 'neutral' | 'warning' | 'success' | 'status-closed' }> = {
  draft:      { label: 'Draft',      variant: 'status-draft'  },
  pending:    { label: 'Pending',    variant: 'neutral'       },
  incomplete: { label: 'Incomplete', variant: 'warning'       },
  fulfilled:  { label: 'Fulfilled',  variant: 'success'       },
  closed:     { label: 'Closed',     variant: 'status-closed' },
};

interface EditLine {
  id: string;
  internCategory: string;
  calendarPeriod: string;
  calendarStart: string;   // ISO "YYYY-MM-DD"
  calendarEnd: string;     // ISO "YYYY-MM-DD"
  duration: string;
  placements: number;
  customWindow?: boolean;  // true → free date-range picker instead of category presets
  requestId?: string;
}

interface EditModel {
  programmeCentre: string;
  pcHead: string;
  headName: string;
  adpnc: string;
  deadline: string;
  intakeYear: number;   // calendar year the internship windows are anchored to
  lines: EditLine[];
}

function decodeRouteParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ? decodeURIComponent(raw) : '';
}

function requestKey(req: ProjectRequest) {
  return req.uploadToken || req.id || `${req.pc}::${req.educationLevel}::${req.internCategory ?? ''}`;
}

function isDraft(req: ProjectRequest) {
  return !req.sentDate || !req.uploadToken;
}

function draftRequestGroupKey(req: ProjectRequest): string {
  const match = req.id?.match(/^draft-request-(\d+)/);
  return match?.[1] ?? req.id ?? `${req.pc}::${req.deadline}::${req.educationLevel}::${req.internCategory ?? ''}`;
}

/* A sent request whose response-deadline day has passed is closed. */
function deadlinePassed(deadline: string): boolean {
  if (!deadline) return false;
  const dl = new Date(deadline);
  if (Number.isNaN(dl.getTime())) return false;
  const dlDay = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate()).getTime();
  const now = new Date();
  return dlDay < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function requestDisplayStatus(req: ProjectRequest): DisplayRequestStatus {
  if (isDraft(req)) return 'draft';
  if (deadlinePassed(req.deadline)) return 'closed';
  if (req.status === 'pending') return 'pending';
  if (req.status === 'partial' || req.status === 'overdue') return 'incomplete';
  return 'fulfilled';
}

function fmtDate(value: string) {
  if (!value) return '-';
  return formatDate(value);
}

function recipientLabel(email: string) {
  if (!email) return '';
  return CONTACTS.find(c => c.email === email)?.name
    ?? Object.values(ROLE_PROFILES).find(p => p.email === email)?.name
    ?? email;
}

/* HQ recipients cc'd on every project-request email (sent from a system address). */
const HQ_CC_RECIPIENTS = ['Jasmine (Internship HQ)', 'Jeryn', 'Keng Yen'];

const TEMPLATE_FILENAME = 'DSTA_Project_Request_Template.xlsx';

function parseCcList(cc: string | undefined): string[] {
  if (!cc) return [];
  return cc.split(',').map(s => s.trim()).filter(Boolean);
}

function FieldHelpTooltip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${label} help`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <Info size={12} />
          </button>
        }
      />
      <TooltipContent side="top" align="start" className="max-w-56">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/* Canonical Programme Centre order (mirrors the PC dropdown in PROJECT_SUBMISSION_COLUMNS),
   so the request-form picker lists centres in the same order as the rest of the app. */
const PC_ORDER = ['AS', 'CIO', 'Cyber', 'DH', 'EDS', 'Info', 'MDS', 'PC3', 'PC4', 'PC5', 'PC6', 'PC8', 'PC9', 'PC10', 'PC11', 'SECC', 'STSH', 'CSIT'];

type RecipientDepartment = 'DSTA' | 'DSO' | 'CSIT';

function contactPcForProgrammeCentre(programmeCentre: string): string {
  if (programmeCentre === 'DSO') {
    return CONTACTS.find(c => c.title === 'Programme Centre Head' && c.department === 'DSO' && c.pc)?.pc ?? '';
  }
  return programmeCentre;
}

function programmeCentreOptions() {
  const options = CONTACTS
    .filter(c => c.title === 'Programme Centre Head' && c.pc)
    .map(c => ({
      value: c.department === 'DSO' ? 'DSO' : c.pc!,
      department: c.department as RecipientDepartment,
    }));

  const unique = Array.from(new Map(options.map(option => [option.value, option])).values());
  // Canonical PC order first, DSO (and any unlisted centre) last.
  return unique.sort((a, b) => {
    const ia = PC_ORDER.indexOf(a.value), ib = PC_ORDER.indexOf(b.value);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function departmentForProgrammeCentre(programmeCentre: string): RecipientDepartment {
  const pc = contactPcForProgrammeCentre(programmeCentre);
  return (CONTACTS.find(c => c.title === 'Programme Centre Head' && c.pc === pc)?.department as RecipientDepartment) ?? 'DSTA';
}

/** DSO and CSIT are external agencies with no Programme Centre Head — requests to
    them go straight to their AD (P&C), with no PC Head recipient. */
function centreHasNoPcHead(programmeCentre: string): boolean {
  if (!programmeCentre) return false;
  return departmentForProgrammeCentre(programmeCentre) !== 'DSTA';
}

function pcHeadForProgrammeCentre(programmeCentre: string): string {
  if (centreHasNoPcHead(programmeCentre)) return '';
  const pc = contactPcForProgrammeCentre(programmeCentre);
  return CONTACTS.find(c => c.title === 'Programme Centre Head' && c.pc === pc)?.email ?? '';
}

function adPncForProgrammeCentre(programmeCentre: string): string {
  // Derived straight from the centre (not via the PC Head), so DSO/CSIT — which
  // have no PC Head — still resolve their AD (P&C).
  const pc = contactPcForProgrammeCentre(programmeCentre);
  const department = departmentForProgrammeCentre(programmeCentre);
  return CONTACTS.find(c => c.title === 'AD (P&C)' && c.department === department && c.pc === pc)?.email ?? '';
}

function pcHeadsForCentre(programmeCentre: string) {
  return CONTACTS.filter(c => c.title === 'Programme Centre Head' && c.pc === programmeCentre);
}

function adPncForPcHead(email: string) {
  const head = CONTACTS.find(c => c.email === email);
  const pc = head?.pc;
  const department = head?.department;
  return CONTACTS.find(c => c.title === 'AD (P&C)' && c.department === department && c.pc === pc)?.email ?? '';
}

function programmeCentreForPcHead(email: string) {
  return CONTACTS.find(c => c.email === email)?.pc ?? '';
}

function modelFromRequests(requests: ProjectRequest[]): EditModel {
  const first = requests[0];
  const lines = requests.map((req, index) => {
    const cp = req.calendarPeriod ?? '';
    const { start, end } = parseCalendarPeriod(cp);
    // Prefer stored ISO day bounds; fall back to converting the legacy month label to first/last day.
    const isoStart = /^\d{4}-\d{2}-\d{2}$/.test(req.periodStart ?? '') ? req.periodStart! : isoDay(start, false);
    const isoEnd = /^\d{4}-\d{2}-\d{2}$/.test(req.periodEnd ?? '') ? req.periodEnd! : isoDay(end, true);
    const category = req.internCategory ?? req.educationLevel;
    const year = intakeYearFromPeriodStart(isoStart || req.periodStart);
    return {
      id: req.id || `line-${index}`,
      requestId: req.id,
      internCategory: toEducationLevel(category),
      calendarPeriod: monthRangeLabel(isoStart, isoEnd) || cp,
      calendarStart: isoStart,
      calendarEnd: isoEnd,
      duration: req.duration ?? '',
      placements: req.placements,
      customWindow: !isPresetWindow(category, isoStart, isoEnd, year),
    };
  });
  const intakeYear = lines[0]?.calendarStart
    ? intakeYearFromPeriodStart(lines[0].calendarStart)
    : DEFAULT_INTAKE_YEAR;
  const programmeCentre = first?.programmeCenter || programmeCentreForPcHead(first?.pc ?? '');
  return {
    programmeCentre,
    pcHead: centreHasNoPcHead(programmeCentre) ? '' : (first?.pc ?? ''),
    headName: first?.headName ?? recipientLabel(first?.pc ?? ''),
    adpnc: adPncForProgrammeCentre(programmeCentre),
    deadline: first?.deadline ?? '',
    intakeYear,
    lines,
  };
}

function emptyDraftModel(): EditModel {
  return {
    programmeCentre: '',
    pcHead: '',
    headName: '',
    adpnc: '',
    deadline: '',
    intakeYear: DEFAULT_INTAKE_YEAR,
    lines: [{ id: `line-${Date.now()}`, internCategory: '', calendarPeriod: '', calendarStart: '', calendarEnd: '', duration: '', placements: 1, customWindow: false }],
  };
}

function missingFields(model: EditModel) {
  const missing: string[] = [];
  if (!model.programmeCentre) missing.push('Programme Centre');
  if (!model.pcHead) missing.push('PC Head');
  if (!model.deadline) missing.push('Response Deadline');
  if (model.lines.length === 0 || model.lines.some(line =>
    !line.internCategory || !line.calendarPeriod || !line.duration || line.placements < 1
  )) missing.push('Placement Requirements');
  return missing;
}

function appendAudit(entry: Omit<ProjectRequestAuditEntry, 'id' | 'at'>) {
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

function saveAuditEntries(entries: Array<Omit<ProjectRequestAuditEntry, 'id' | 'at'>>) {
  if (entries.length === 0) return;
  const logs = loadRequestAuditLogs();
  const now = new Date().toISOString();
  saveRequestAuditLogs([
    ...entries.map((entry, index) => ({
      ...entry,
      id: `audit-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      at: now,
    })),
    ...logs,
  ]);
}

function StepIndicator({ step, mode, onStepClick }: { step: 1 | 2; mode: RequestMode; onStepClick: (step: 1 | 2) => void }) {
  const labels = mode === 'draft'
    ? ['Build Request', 'Review Draft']
    : ['Request Details', 'Review'];
  return (
    <div className="flex items-center">
      {labels.map((label, index) => {
        const number = (index + 1) as 1 | 2;
        const active = step === number;
        const visited = number <= step;
        return (
          <Fragment key={label}>
            <button
              type="button"
              onClick={() => onStepClick(number)}
              className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-accent/5"
            >
              <span className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                active || visited ? 'bg-accent text-accent-fg' : 'border border-border bg-bg-muted text-fg-muted',
              )}>
                {visited && !active ? <Check size={12} /> : number}
              </span>
              <span className={cn('text-xs font-semibold', active ? 'text-accent' : 'text-fg-muted')}>{label}</span>
            </button>
            {index === 0 && <div className="mx-4 h-px flex-1 bg-border" />}
          </Fragment>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className={cn('flex h-9 w-32 items-center overflow-hidden rounded-md border border-border bg-surface', disabled && 'bg-bg-subtle opacity-60')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-full w-9 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Decrease placements"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        min={1}
        disabled={disabled}
        value={value === 0 ? '' : value}
        onChange={e => { const n = parseInt(e.target.value, 10); onChange(isNaN(n) ? 0 : n); }}
        onBlur={e => { const n = parseInt(e.target.value, 10); if (isNaN(n) || n < 1) onChange(1); }}
        className="h-full w-full min-w-0 border-x border-border bg-transparent text-center text-body-md text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:bg-bg-subtle disabled:text-fg-muted"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="flex h-full w-9 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Increase placements"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function SectionDivider({ label, uppercase = true, showLine = true }: { label: string; uppercase?: boolean; showLine?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={cn('whitespace-nowrap tracking-wider text-fg-muted', uppercase && 'uppercase')}>
        <span className="text-label-sm font-semibold">{label}</span>
      </span>
      {showLine && <div className="flex-1 border-t border-border" />}
    </div>
  );
}

function PlacementsTable({
  rows,
  placementsHeader = 'Placements',
}: {
  rows: Array<{ label: string; calendarPeriod?: string; duration?: string; placements: number }>;
  placementsHeader?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Intern category</TableHead>
            <TableHead>Internship window</TableHead>
            <TableHead>Project duration</TableHead>
            <TableHead>{placementsHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium text-fg">{row.label || '-'}</TableCell>
              <TableCell className="text-fg-muted">{row.calendarPeriod || '-'}</TableCell>
              <TableCell className="text-fg-muted">{row.duration || '-'}</TableCell>
              <TableCell className="text-fg">{row.placements}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PlacementChangesTable({
  changes,
}: {
  changes: Array<{ field: string; from?: string; to?: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Intern category</TableHead>
            <TableHead>Before</TableHead>
            <TableHead>After</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes.map(change => (
            <TableRow key={change.field}>
              <TableCell className="font-medium text-fg">{change.field.replace(/ placements$/, '')}</TableCell>
              <TableCell className="text-fg-muted">{change.from ?? '-'}</TableCell>
              <TableCell className="text-fg">{change.to ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecipientChip({ email, role, badgeVariant }: { email: string; role: string; badgeVariant?: 'info' | 'neutral' | 'subtle' }) {
  return (
    <span className="inline-flex h-9 max-w-full items-center gap-2 text-sm">
      <span className="min-w-0 truncate text-sm font-medium text-fg">{recipientLabel(email)}</span>
      <Badge variant={badgeVariant || 'neutral'} className="shrink-0 text-caption font-medium">{role}</Badge>
    </span>
  );
}

function DerivedRecipients({ pcHead, adpnc, showAll = false, ccEmails, toEmails }: { pcHead: string; adpnc: string; showAll?: boolean; ccEmails?: string; toEmails?: string }) {
  const [showAllRecipients, setShowAllRecipients] = useState(showAll);
  const ccList = ccEmails ? parseCcList(ccEmails) : HQ_CC_RECIPIENTS;
  const toList = toEmails ? parseCcList(toEmails) : [];

  if (!pcHead && !adpnc) {
    return (
      <div className="flex h-9 w-full items-center overflow-hidden rounded-md border border-border bg-surface px-3 py-1 text-sm text-fg-subtle shadow-sm">
        <span className="truncate">Fills in once programme centre is chosen</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-4">
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        <span className="w-8 shrink-0 text-caption font-semibold uppercase tracking-wider text-fg-muted">To</span>
        {toList.length > 0 ? toList.map((email, i) => (
          <Fragment key={email}>
            <RecipientChip email={email} role={email === pcHead ? 'PC Head' : email === adpnc ? 'AD (P&C)' : ''} badgeVariant="info" />
            {i < toList.length - 1 && <span className="text-fg-muted">,</span>}
          </Fragment>
        )) : (
          <>
            {pcHead && <RecipientChip email={pcHead} role="PC Head" badgeVariant="info" />}
            {pcHead && adpnc && <span className="text-fg-muted">,</span>}
            {adpnc && <RecipientChip email={adpnc} role="AD (P&C)" badgeVariant="info" />}
          </>
        )}
      </div>
      {showAllRecipients ? (
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <span className="w-8 shrink-0 text-caption font-semibold uppercase tracking-wider text-fg-muted">Cc</span>
          {ccList.map((name, i) => (
            <Fragment key={name}>
              <RecipientChip email={name} role="HQ" badgeVariant="subtle" />
              {i < ccList.length - 1 && <span className="text-fg-muted">,</span>}
            </Fragment>
          ))}
          <Button variant="outline" size="sm" onClick={() => setShowAllRecipients(false)}>
            <ArrowLeftToLine size={14} />Collapse
          </Button>
        </div>
      ) : (
        <div className="flex min-h-9 flex-wrap items-center gap-2">
          <span className="w-8 shrink-0 text-caption font-semibold uppercase tracking-wider text-fg-muted">Cc</span>
          <Button variant="outline" size="sm" onClick={() => setShowAllRecipients(true)}>
            <Users size={14} />View {ccList.length} CC recipients
          </Button>
        </div>
      )}
    </div>
  );
}

function RequestEditor({
  model,
  mode,
  title,
  description,
  canEditDeadline = true,
  canEditPlacements,
  additionalLines,
  showErrors = false,
  ccEdit,
  onRemove,
  onChange,
  onAdditionalLinesChange,
}: {
  model: EditModel;
  mode: RequestMode;
  title?: string;
  description?: string;
  canEditDeadline?: boolean;
  canEditPlacements?: boolean;
  additionalLines?: EditLine[];
  showErrors?: boolean;
  ccEdit?: string;
  onRemove?: () => void;
  onChange: (model: EditModel) => void;
  onAdditionalLinesChange?: (lines: EditLine[]) => void;
}) {
  const disabled = mode === 'open';
  const placementsEditable = canEditPlacements ?? mode === 'draft';
  const canAddLines = mode === 'draft' || !!onAdditionalLinesChange;

  function updateLine(id: string, patch: Partial<EditLine>) {
    onChange({ ...model, lines: model.lines.map(line => line.id === id ? { ...line, ...patch } : line) });
  }

  function updateAdditionalLine(id: string, patch: Partial<EditLine>) {
    if (!additionalLines || !onAdditionalLinesChange) return;
    onAdditionalLinesChange(additionalLines.map(line => line.id === id ? { ...line, ...patch } : line));
  }

  function removeAdditionalLine(id: string) {
    if (!additionalLines || !onAdditionalLinesChange || additionalLines.length === 1) return;
    onAdditionalLinesChange(additionalLines.filter(line => line.id !== id));
  }

  function addLine() {
    const nextLine = { id: `line-${Date.now()}`, internCategory: '', calendarPeriod: '', calendarStart: '', calendarEnd: '', duration: '', placements: 1, customWindow: false as const };
    if (mode === 'draft') {
      onChange({ ...model, lines: [...model.lines, nextLine] });
      return;
    }
    onAdditionalLinesChange?.([...(additionalLines ?? []), { ...nextLine, id: `additional-${Date.now()}` }]);
  }

  return (
    <section className="rounded-xl border-border bg-surface shadow-sm">

      <div className="space-y-6 p-5">
        <div>
          <SectionDivider label="Recipients" uppercase={false} showLine={false} />
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-4 lg:items-start">
            <Field>
              <FieldLabel>
                Programme Centre {!disabled && <span className="text-danger">*</span>}
              </FieldLabel>
              <Select
                value={model.programmeCentre}
                onValueChange={value => {
                  const programmeCentre = value ?? '';
                  const pcHead = pcHeadForProgrammeCentre(programmeCentre);
                  onChange({
                    ...model,
                    programmeCentre,
                    pcHead,
                    headName: recipientLabel(pcHead),
                    adpnc: adPncForProgrammeCentre(programmeCentre),
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger className={cn('min-w-0 overflow-hidden', showErrors && !model.programmeCentre && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select programme centre" /></SelectTrigger>
                <SelectContent>
                  {programmeCentreOptions().map(option => <SelectItem key={option.value} value={option.value}>{option.value}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldRequired show={showErrors && !model.programmeCentre} />
            </Field>
            <Field>
              <FieldLabel>
                Response deadline {!disabled && <span className="text-danger">*</span>}
              </FieldLabel>
              <DatePicker
                value={model.deadline}
                onChange={value => onChange({ ...model, deadline: value })}
                placeholder="Pick a date"
                align="right"
                disabled={!canEditDeadline}
                minDate={sgTomorrow()}
                error={showErrors && !model.deadline}
              />
              <FieldRequired show={showErrors && !model.deadline} />
            </Field>
          </div>
          <div className={cn('mt-3 grid grid-cols-1 gap-3', (model.pcHead || model.adpnc) ? '' : 'lg:grid-cols-2')}>
            <Field>
              <FieldLabel className="flex items-center gap-1.5">
                {!model.programmeCentre && <ArrowUp size={13} className="text-fg-subtle" aria-hidden="true" />}
                Recipients
              </FieldLabel>
              <DerivedRecipients pcHead={model.pcHead} adpnc={model.adpnc} ccEmails={ccEdit} />
            </Field>
          </div>
        </div>

        <div>
          <SectionDivider label="Placement requirements" uppercase={false} showLine={false} />
          <div className="min-w-0 space-y-3 overflow-x-auto pb-1">
            <div className="mb-4">
              <Field className="w-fit">
                <FieldLabel className="flex items-center gap-1.5">
                  Internship year <span className="text-danger">*</span>
                  <FieldHelpTooltip label="Internship year">The calendar year these internship windows are for — the window options shift to this year.</FieldHelpTooltip>
                </FieldLabel>
                <Select
                  value={String(model.intakeYear ?? INTAKE_BASE_YEAR)}
                  onValueChange={v => {
                    if (!v) return;
                    const ny = parseInt(v, 10);
                    const dy = ny - (model.intakeYear ?? INTAKE_BASE_YEAR);
                    onChange({
                      ...model,
                      intakeYear: ny,
                      lines: model.lines.map(l => {
                        if (l.customWindow || !l.calendarStart || !l.calendarEnd) return l;
                        const cs = shiftIsoYears(l.calendarStart, dy), ce = shiftIsoYears(l.calendarEnd, dy);
                        return { ...l, calendarStart: cs, calendarEnd: ce, calendarPeriod: monthRangeLabel(cs, ce) };
                      }),
                    });
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-9 w-28"><SelectValue className="truncate block" /></SelectTrigger>
                  <SelectContent>
                    {INTAKE_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <FieldLabelText className="flex items-center gap-1.5">
                Intern category {!disabled && <span className="text-danger">*</span>}
                <FieldHelpTooltip label="Intern category">The type of intern the project is for</FieldHelpTooltip>
              </FieldLabelText>
              <FieldLabelText className="flex items-center gap-1.5">
                Internship window {!disabled && <span className="text-danger">*</span>}
                <FieldHelpTooltip label="Internship window">Proposed projects should be able to run within this period</FieldHelpTooltip>
              </FieldLabelText>
              <FieldLabelText className="flex items-center gap-1.5">
                Project duration {!disabled && <span className="text-danger">*</span>}
                <FieldHelpTooltip label="Project duration">Proposed projects should last around this length of time</FieldHelpTooltip>
              </FieldLabelText>
              <FieldLabelText>Placements {!disabled && <span className="text-danger">*</span>}</FieldLabelText>
            </div>
            {model.lines.map(line => (
              <div key={line.id} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <Field>
                  <FieldLabel className="flex items-center gap-1.5 lg:hidden">
                    Intern category {!disabled && <span className="text-danger">*</span>}
                  </FieldLabel>
                  <Select value={line.internCategory} onValueChange={value => updateLine(line.id, { internCategory: value ?? '', calendarStart: '', calendarEnd: '', calendarPeriod: '', customWindow: false })} disabled={disabled}>
                    <SelectTrigger className={cn('min-w-0 overflow-hidden', showErrors && !line.internCategory && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select intern category" /></SelectTrigger>
                    <SelectContent className="max-w-[min(28rem,var(--available-width))]">
                      {INTERN_CATEGORIES.map(category => <SelectItem key={category} value={category} className="whitespace-normal leading-snug">{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FieldRequired show={showErrors && !line.internCategory} />
                </Field>
                <Field>
                  <FieldLabel className="flex items-center gap-1.5 lg:hidden">
                    Internship window {!disabled && <span className="text-danger">*</span>}
                    <FieldHelpTooltip label="Internship window">Options follow the selected intern category; pick Customise for a bespoke window</FieldHelpTooltip>
                  </FieldLabel>
                  {(() => {
                    const yearShift = (model.intakeYear ?? INTAKE_BASE_YEAR) - INTAKE_BASE_YEAR;
                    const winPresets = (INTERNSHIP_WINDOWS[line.internCategory] || []).map(p => {
                      const start = mmmyyToISO(shiftMMMYY(p.start, yearShift)), end = mmmyyToISOEnd(shiftMMMYY(p.end, yearShift));
                      return { label: monthRangeLabel(start, end), start, end };
                    });
                    const winCustom = !!line.customWindow || (!!line.internCategory && winPresets.length === 0);
                    const winSelected = winPresets.find(p => p.start === line.calendarStart && p.end === line.calendarEnd)?.label ?? '';
                    return !line.internCategory ? (
                      <Select disabled>
                        <SelectTrigger className={cn('min-w-0 overflow-hidden', showErrors && !line.calendarStart && 'border-danger disabled:opacity-100')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select intern category first" /></SelectTrigger>
                      </Select>
                    ) : winCustom ? (
                      <div className="space-y-1">
                        <DateRangePicker
                          value={{
                            from: line.calendarStart ? parseISO(line.calendarStart) : undefined,
                            to: line.calendarEnd ? parseISO(line.calendarEnd) : undefined,
                          }}
                          onChange={(range: DateRange) => {
                            const calendarStart = range.from ? formatISO(range.from, { representation: 'date' }) : '';
                            const calendarEnd = range.to ? formatISO(range.to, { representation: 'date' }) : '';
                            const s = toMonthIndex(calendarStart), e = toMonthIndex(calendarEnd);
                            const wm = (s !== null && e !== null && e >= s) ? (e - s + 1) : 0;
                            const patch: Partial<EditLine> = { calendarStart, calendarEnd, calendarPeriod: monthRangeLabel(calendarStart, calendarEnd) };
                            if (wm && line.duration && parseInt(line.duration, 10) > wm) patch.duration = '';
                            updateLine(line.id, patch);
                          }}
                          disabled={disabled}
                          placeholder="Select start and end date"
                          hideLabels
                          hideFooter
                          className={cn('w-full min-w-0', showErrors && !!line.internCategory && (!line.calendarStart || !line.calendarEnd) && 'border-danger')}
                        />
                        {winPresets.length > 0 && !disabled && (
                          <button type="button" className="text-label-sm text-accent hover:underline" onClick={() => updateLine(line.id, { customWindow: false, calendarStart: '', calendarEnd: '', calendarPeriod: '' })}>Use a preset window</button>
                        )}
                      </div>
                    ) : (
                      <Select
                        value={winSelected}
                        onValueChange={v => {
                          if (v === '__custom__') { updateLine(line.id, { customWindow: true, calendarStart: '', calendarEnd: '', calendarPeriod: '' }); return; }
                          const p = winPresets.find(x => x.label === v);
                          if (!p) return;
                          const ps = toMonthIndex(p.start), pe = toMonthIndex(p.end);
                          const wm = (ps !== null && pe !== null) ? (pe - ps + 1) : 0;
                          const patch: Partial<EditLine> = { calendarStart: p.start, calendarEnd: p.end, calendarPeriod: monthRangeLabel(p.start, p.end), customWindow: false };
                          if (wm && line.duration && parseInt(line.duration, 10) > wm) patch.duration = '';
                          updateLine(line.id, patch);
                        }}
                        disabled={disabled}
                      >
                        <SelectTrigger className={cn('min-w-0 overflow-hidden', showErrors && !line.calendarStart && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select internship window" /></SelectTrigger>
                        <SelectContent>
                          {winPresets.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
                          <SelectItem value="__custom__">Customise…</SelectItem>
                        </SelectContent>
                      </Select>
                    );
                  })()}
                  <FieldRequired show={showErrors && (!line.calendarStart || !line.calendarEnd)} />
                </Field>
                <Field>
                  <FieldLabel className="flex items-center gap-1.5 lg:hidden">
                    Project duration {!disabled && <span className="text-danger">*</span>}
                    <FieldHelpTooltip label="Project duration">Proposed projects should last around this length of time</FieldHelpTooltip>
                  </FieldLabel>
                  {(() => {
                    const winStart = toMonthIndex(line.calendarStart), winEnd = toMonthIndex(line.calendarEnd);
                    const winMonths = (winStart !== null && winEnd !== null && winEnd >= winStart) ? (winEnd - winStart + 1) : 0;
                    const durOptions = winMonths ? DURATIONS.filter(d => parseInt(d, 10) <= winMonths) : [...DURATIONS];
                    return (
                      <Select value={line.duration} onValueChange={value => updateLine(line.id, { duration: value ?? '' })} disabled={disabled}>
                        <SelectTrigger className={cn('min-w-0 overflow-hidden', showErrors && !line.duration && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Project duration" /></SelectTrigger>
                        <SelectContent>
                          {durOptions.map(duration => <SelectItem key={duration} value={duration}>{duration}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                  <FieldRequired show={showErrors && !line.duration} />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Field>
                      <FieldLabel className="lg:hidden">Placements {!disabled && <span className="text-danger">*</span>}</FieldLabel>
                      <Stepper value={line.placements} disabled={!placementsEditable} onChange={value => updateLine(line.id, { placements: value })} />
                    </Field>
                    {mode === 'draft' && (
                      <button
                        type="button"
                        disabled={model.lines.length === 1}
                        onClick={() => onChange({ ...model, lines: model.lines.filter(item => item.id !== line.id) })}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-90"
                        aria-label="Remove intern category"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <FieldRequired show={showErrors && line.placements < 1} />
                </div>
              </div>
            ))}
            {additionalLines?.map(line => (
              <div key={line.id} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                <Select value={line.internCategory} onValueChange={value => updateAdditionalLine(line.id, { internCategory: value ?? '', calendarStart: '', calendarEnd: '', calendarPeriod: '', customWindow: false })}>
                  <SelectTrigger className="min-w-0 overflow-hidden"><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select intern category" /></SelectTrigger>
                  <SelectContent className="max-w-[min(28rem,var(--available-width))]">
                    {INTERN_CATEGORIES.map(category => <SelectItem key={category} value={category} className="whitespace-normal leading-snug">{category}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(() => {
                  const yearShift = (model.intakeYear ?? INTAKE_BASE_YEAR) - INTAKE_BASE_YEAR;
                  const winPresets = (INTERNSHIP_WINDOWS[line.internCategory] || []).map(p => {
                    const start = mmmyyToISO(shiftMMMYY(p.start, yearShift)), end = mmmyyToISOEnd(shiftMMMYY(p.end, yearShift));
                    return { label: monthRangeLabel(start, end), start, end };
                  });
                  const winCustom = !!line.customWindow || (!!line.internCategory && winPresets.length === 0);
                  const winSelected = winPresets.find(p => p.start === line.calendarStart && p.end === line.calendarEnd)?.label ?? '';
                  const winStart = toMonthIndex(line.calendarStart), winEnd = toMonthIndex(line.calendarEnd);
                  const winMonths = (winStart !== null && winEnd !== null && winEnd >= winStart) ? (winEnd - winStart + 1) : 0;
                  const durOptions = winMonths ? DURATIONS.filter(d => parseInt(d, 10) <= winMonths) : [...DURATIONS];
                  return (
                    <>
                      {!line.internCategory ? (
                        <Select disabled>
                          <SelectTrigger className="min-w-0 overflow-hidden"><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select intern category first" /></SelectTrigger>
                        </Select>
                      ) : winCustom ? (
                        <div className="space-y-1">
                          <DateRangePicker
                            value={{
                              from: line.calendarStart ? parseISO(line.calendarStart) : undefined,
                              to: line.calendarEnd ? parseISO(line.calendarEnd) : undefined,
                            }}
                            onChange={(range: DateRange) => {
                              const calendarStart = range.from ? formatISO(range.from, { representation: 'date' }) : '';
                              const calendarEnd = range.to ? formatISO(range.to, { representation: 'date' }) : '';
                              const s = toMonthIndex(calendarStart), e = toMonthIndex(calendarEnd);
                              const wm = (s !== null && e !== null && e >= s) ? (e - s + 1) : 0;
                              const patch: Partial<EditLine> = { calendarStart, calendarEnd, calendarPeriod: monthRangeLabel(calendarStart, calendarEnd) };
                              if (wm && line.duration && parseInt(line.duration, 10) > wm) patch.duration = '';
                              updateAdditionalLine(line.id, patch);
                            }}
                            placeholder="Select start and end date"
                            hideLabels
                            hideFooter
                          />
                          {winPresets.length > 0 && (
                            <button type="button" className="text-label-sm text-accent hover:underline" onClick={() => updateAdditionalLine(line.id, { customWindow: false, calendarStart: '', calendarEnd: '', calendarPeriod: '' })}>Use a preset window</button>
                          )}
                        </div>
                      ) : (
                        <Select
                          value={winSelected}
                          onValueChange={v => {
                            if (v === '__custom__') { updateAdditionalLine(line.id, { customWindow: true, calendarStart: '', calendarEnd: '', calendarPeriod: '' }); return; }
                            const p = winPresets.find(x => x.label === v);
                            if (!p) return;
                            const ps = toMonthIndex(p.start), pe = toMonthIndex(p.end);
                            const wm = (ps !== null && pe !== null) ? (pe - ps + 1) : 0;
                            const patch: Partial<EditLine> = { calendarStart: p.start, calendarEnd: p.end, calendarPeriod: monthRangeLabel(p.start, p.end), customWindow: false };
                            if (wm && line.duration && parseInt(line.duration, 10) > wm) patch.duration = '';
                            updateAdditionalLine(line.id, patch);
                          }}
                        >
                          <SelectTrigger className="min-w-0 overflow-hidden"><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select internship window" /></SelectTrigger>
                          <SelectContent>
                            {winPresets.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
                            <SelectItem value="__custom__">Customise…</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Select value={line.duration} onValueChange={value => updateAdditionalLine(line.id, { duration: value ?? '' })}>
                        <SelectTrigger className="min-w-0 overflow-hidden"><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Project duration" /></SelectTrigger>
                        <SelectContent>
                          {durOptions.map(duration => <SelectItem key={duration} value={duration}>{duration}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </>
                  );
                })()}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Field>
                      <FieldLabel className="lg:hidden">Placements</FieldLabel>
                      <Stepper value={line.placements} onChange={value => updateAdditionalLine(line.id, { placements: value })} />
                    </Field>
                    <button
                      type="button"
                      disabled={additionalLines.length === 1}
                      onClick={() => removeAdditionalLine(line.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-90"
                      aria-label="Remove intern category"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {canAddLines && (
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus size={14} />Add intern category
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdditionalInternCategoryPanel({
  lines,
  onChange,
}: {
  lines: EditLine[];
  onChange: (lines: EditLine[]) => void;
}) {
  function updateLine(id: string, patch: Partial<EditLine>) {
    onChange(lines.map(line => line.id === id ? { ...line, ...patch } : line));
  }

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-label-lg font-medium text-fg">Add Intern Category</h2>
        <p className="mt-0.5 text-body-sm text-fg-muted">
          Add new placement requirements to this open request. Existing sent categories remain unchanged.
        </p>
      </div>
      <div className="space-y-3 p-5">
        <div className="hidden gap-3 sm:grid sm:grid-cols-[minmax(13rem,1fr)_9rem_8rem_7rem_36px]">
          <span className="text-table-header tracking-wider text-fg-muted">Intern category</span>
          <span className="text-table-header tracking-wider text-fg-muted">Internship window</span>
          <span className="text-table-header tracking-wider text-fg-muted">Project duration</span>
          <span className="text-table-header tracking-wider text-fg-muted">Placements</span>
          <span />
        </div>
        {lines.map(line => (
          <div key={line.id} className="grid gap-3 sm:grid-cols-[minmax(13rem,1fr)_9rem_8rem_7rem_36px] sm:items-center">
            <Select value={line.internCategory} onValueChange={value => updateLine(line.id, { internCategory: value ?? '' })}>
              <SelectTrigger><SelectValue placeholder="Select intern category" /></SelectTrigger>
              <SelectContent>
                {INTERN_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangePicker
              value={{
                from: line.calendarStart ? parseISO(line.calendarStart) : undefined,
                to: line.calendarEnd ? parseISO(line.calendarEnd) : undefined,
              }}
              onChange={(range: DateRange) => {
                const calendarStart = range.from ? formatISO(range.from, { representation: 'date' }) : '';
                const calendarEnd = range.to ? formatISO(range.to, { representation: 'date' }) : '';
                updateLine(line.id, { calendarStart, calendarEnd, calendarPeriod: monthRangeLabel(calendarStart, calendarEnd) });
              }}
              placeholder="Select start and end date"
              hideLabels
              hideFooter
            />
            <Select value={line.duration} onValueChange={value => updateLine(line.id, { duration: value ?? '' })}>
              <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map(duration => <SelectItem key={duration} value={duration}>{duration}</SelectItem>)}
              </SelectContent>
            </Select>
            <Stepper value={line.placements} onChange={value => updateLine(line.id, { placements: value })} />
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() => onChange(lines.filter(item => item.id !== line.id))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Remove intern category"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...lines, { id: `additional-${Date.now()}`, internCategory: '', calendarPeriod: '', calendarStart: '', calendarEnd: '', duration: '', placements: 1 }])}
        >
          <Plus size={14} />Add intern category
        </Button>
      </div>
    </section>
  );
}

function DraftEmailPreview({ model, emailEdits, onEmailChange }: { model: EditModel; emailEdits: { to: string; cc: string }; onEmailChange: (patch: Partial<{ to: string; cc: string }>) => void }) {
  const rows = model.lines.map(line => ({
    label: line.internCategory,
    calendarPeriod: line.calendarPeriod,
    duration: line.duration,
    placements: line.placements,
  }));

  const [subjectDraft, setSubjectDraft] = useState(() => `Project Request - ${model.programmeCentre || 'Programme Centre'}`);
  const [beforeDraft, setBeforeDraft] = useState(() =>
    `Dear ${recipientLabel(model.adpnc) || 'recipient'},\n\n`
    + `We are requesting project submissions for the intern categories, calendar periods and durations listed below.`
  );
  const [afterDraft, setAfterDraft] = useState(() =>
    `Please submit your project proposals by ${fmtDate(model.deadline)}.\n\nThank you.`
  );

  return (
    <>
    <p className="text-body-sm text-fg-muted">The recipients, subject and message below are editable. Click into a field to customise the email before sending.</p>
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="space-y-3">
        <label className="flex items-start gap-3 border-b border-border pb-3">
          <span className="w-16 shrink-0 pt-2 text-body-sm font-medium text-fg-muted">To</span>
          <Combobox
            selected={parseCcList(emailEdits.to)}
            onToggle={(val: string) => {
              const current = new Set(parseCcList(emailEdits.to));
              if (current.has(val)) current.delete(val); else current.add(val);
              onEmailChange({ to: Array.from(current).join(', ') });
            }}
            options={[recipientLabel(model.adpnc)].filter(Boolean)}
            placeholder="Select recipients"
            chips="inline-text"
            hideSearch
            className="flex-1"
          />
        </label>
        <label className="flex items-start gap-3 border-b border-border pb-3">
          <span className="w-16 shrink-0 pt-2 text-body-sm font-medium text-fg-muted">Cc</span>
          <Combobox
            selected={parseCcList(emailEdits.cc)}
            onToggle={(val: string) => {
              const current = new Set(parseCcList(emailEdits.cc));
              if (current.has(val)) current.delete(val); else current.add(val);
              onEmailChange({ cc: Array.from(current).join(', ') });
            }}
            options={[recipientLabel(model.pcHead), ...HQ_CC_RECIPIENTS].filter(Boolean)}
            placeholder="Select recipients"
            chips="inline-text"
            hideSearch
            className="flex-1"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Subject</span>
          <input
            value={subjectDraft}
            onChange={e => setSubjectDraft(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-1 text-body-sm font-medium text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
          />
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Paperclip size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-fg">{TEMPLATE_FILENAME}</p>
            <p className="text-caption text-fg-muted">Project-submission template — pre-structured with the requested intern categories &amp; calendar periods.</p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Download size={14} />Download
          </Button>
        </div>
      </div>
    </div>
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <label className="block">
        <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Opening message</span>
        <textarea
          value={beforeDraft}
          onChange={e => setBeforeDraft(e.target.value)}
          rows={Math.max(2, beforeDraft.split('\n').length)}
          className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 font-sans text-body-sm leading-6 text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
      </label>
      <div className="overflow-hidden rounded-lg border border-border bg-bg-subtle p-4">
        <PlacementsTable rows={rows} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Closing message</span>
        <textarea
          value={afterDraft}
          onChange={e => setAfterDraft(e.target.value)}
          rows={Math.max(2, afterDraft.split('\n').length)}
          className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 font-sans text-body-sm leading-6 text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
      </label>
    </div>
    </>
  );
}

function DraftReviewDetails({ model, onPreview, emailEdits }: { model: EditModel; onPreview: () => void; emailEdits?: { to: string; cc: string } }) {
  return (
    <div className="space-y-5 px-5 pb-5 pt-4">
      <div>
        <SectionDivider label="Recipients" uppercase={false} showLine={false} />
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SummaryItem label="Programme Centre" value={model.programmeCentre} />
            <SummaryItem label="Response deadline" value={fmtDate(model.deadline)} />
          </div>
          <div>
            <p className="mb-1 text-caption text-fg-muted">Recipients</p>
            <ReviewRecipientChips model={model} emailEdits={emailEdits} />
          </div>
        </div>
      </div>
      <div>
        <SectionDivider label="Placement requirements" uppercase={false} showLine={false} />
        <PlacementsTable rows={model.lines.map(line => ({
          label: line.internCategory,
          calendarPeriod: line.calendarPeriod,
          duration: line.duration,
          placements: line.placements,
        }))} />
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={onPreview}><Eye size={15} />Preview email</Button>
      </div>
    </div>
  );
}

function ReviewRecipientChips({ model, emailEdits }: { model: EditModel; emailEdits?: { to: string; cc: string } }) {
  return <DerivedRecipients pcHead={model.pcHead} adpnc={model.adpnc} showAll ccEmails={emailEdits?.cc} toEmails={emailEdits?.to} />;
}

function ReviewPanel({ model, mode, onPreview, emailEdits }: { model: EditModel; mode: RequestMode; onPreview?: () => void; emailEdits?: { to: string; cc: string } }) {
  const total = model.lines.reduce((sum, line) => sum + line.placements, 0);
  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-label-lg font-bold text-fg">{mode === 'draft' ? 'Review Draft' : 'Request Summary'}</h2>
        <p className="mt-0.5 text-body-sm text-fg-muted">
          {model.programmeCentre || '-'} · {recipientLabel(model.pcHead) || '-'} · {total} placement{total === 1 ? '' : 's'}
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <SectionDivider label="Recipients" uppercase={false} showLine={false} />
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <SummaryItem label="Programme Centre" value={model.programmeCentre} />
              <SummaryItem label="Response deadline" value={fmtDate(model.deadline)} />
            </div>
            <div>
              <p className="mb-1 text-caption text-fg-muted">Recipients</p>
              <ReviewRecipientChips model={model} emailEdits={emailEdits} />
            </div>
          </div>
        </div>
        <PlacementsTable rows={model.lines.map(line => ({
          label: line.internCategory,
          calendarPeriod: line.calendarPeriod,
          duration: line.duration,
          placements: line.placements,
        }))} />
        {onPreview && (
          <div>
            <Button variant="outline" size="sm" onClick={onPreview}><Eye size={15} />Preview email</Button>
          </div>
        )}
      </div>
    </section>
  );
}

function ManageReviewPanel({
  model,
  group,
  deadlineChanged,
  placementChanges,
  additionalLines,
  onPreview,
  emailEdits,
}: {
  model: EditModel;
  group: ProjectRequest[];
  deadlineChanged: boolean;
  placementChanges: Array<{ field: string; from?: string; to?: string }>;
  additionalLines: EditLine[];
  onPreview: () => void;
  emailEdits?: { to: string; cc: string };
}) {
  const totalSlots = additionalLines.reduce((sum, line) => sum + line.placements, 0);
  const oldDeadline = group[0]?.deadline ?? '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-xl border border-info/20 bg-info-bg px-4 py-2.5">
        <Clock size={14} className="shrink-0 text-info" />
        <p className="text-body-sm text-fg">Automatic reminders will be sent <span className="font-semibold">14 and 7 days before the deadline</span>.</p>
      </div>
      <section className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-label-lg font-bold text-fg">Review request update</h2>
          <p className="mt-0.5 text-body-sm text-fg-muted">Check the update before sending. Use “Preview email” to see the message a recipient will receive.</p>
        </div>
        <div className="space-y-5 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-muted text-label-sm font-semibold text-fg-muted">1</span>
            <span className="truncate text-body-sm font-medium text-fg">
              {recipientLabel(model.pcHead) || 'No PC Head'} · {fmtDate(model.deadline)} · {totalSlots} additional placement{totalSlots === 1 ? '' : 's'}
            </span>
          </div>

          <div>
            <SectionDivider label="Recipients" uppercase={false} showLine={false} />
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <SummaryItem label="Programme Centre" value={model.programmeCentre} />
                <SummaryItem
                  label="Response deadline"
                  value={deadlineChanged ? `${fmtDate(oldDeadline)} -> ${fmtDate(model.deadline)}` : fmtDate(model.deadline)}
                />
              </div>
              <div>
                <p className="mb-1 text-caption text-fg-muted">Recipients</p>
                <ReviewRecipientChips model={model} emailEdits={emailEdits} />
              </div>
            </div>
          </div>

          {placementChanges.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[12px] font-black uppercase tracking-widest text-fg-subtle">Placement Updates</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full border-collapse text-body-sm">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">Intern category</th>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">Before</th>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {placementChanges.map(change => (
                      <tr key={change.field}>
                        <td className="px-3 py-2 font-medium text-fg">{change.field.replace(/ placements$/, '')}</td>
                        <td className="px-3 py-2 text-fg-muted">{change.from ?? '-'}</td>
                        <td className="px-3 py-2 text-fg">{change.to ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {additionalLines.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[12px] font-black uppercase tracking-widest text-fg-subtle">Additional Placement Requirements</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full border-collapse text-body-sm">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">Intern category</th>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">Internship window</th>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">Project duration</th>
                      <th className="px-3 py-2 text-left text-table-header text-fg-muted">Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {additionalLines.map(line => (
                      <tr key={line.id}>
                        <td className="px-3 py-2 font-medium text-fg">{line.internCategory}</td>
                        <td className="px-3 py-2 text-fg-muted">{line.calendarPeriod}</td>
                        <td className="px-3 py-2 text-fg-muted">{line.duration}</td>
                        <td className="px-3 py-2 text-fg">{line.placements}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button variant="outline" onClick={onPreview}><Eye size={15} />Preview email</Button>
        </div>
      </section>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-caption text-fg-muted">{label}</p>
      <p className="text-body-sm font-medium text-fg">{value || '-'}</p>
    </div>
  );
}

function AuditLogPanel({ logs }: { logs: ProjectRequestAuditEntry[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-label-lg font-bold text-fg">Audit Log</h2>
        <p className="mt-0.5 text-body-sm text-fg-muted">Timeline of changes for this request.</p>
      </div>
      <div className="max-h-[620px] space-y-4 overflow-y-auto p-5">
        {logs.length === 0 ? (
          <p className="text-body-sm text-fg-muted">No audit entries yet.</p>
        ) : logs.map(log => (
          <div key={log.id} className="relative border-l border-border pl-4">
            <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-body-sm font-semibold text-fg">{log.summary}</p>
              <Badge variant="neutral" className="text-caption font-normal">{log.actor}</Badge>
            </div>
            <p className="mt-1 text-caption text-fg-muted">{new Date(log.at).toLocaleString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            {log.changes && log.changes.length > 0 && (
              <div className="mt-2 space-y-1">
                {log.changes.map(change => (
                  <p key={`${log.id}-${change.field}`} className="text-caption text-fg-muted">
                    {change.field}: {change.from || '-'} <ChevronRight size={11} className="inline" /> {change.to || '-'}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LatestActivity({ log, onOpen }: { log?: ProjectRequestAuditEntry; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-caption font-medium text-fg-muted">Latest activity</p>
        <p className="mt-0.5 truncate text-body-sm text-fg">
          {log ? `${log.summary} · ${log.actor}` : 'No audit entries yet.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onOpen}>
        <Clock size={14} />Audit Log
      </Button>
    </div>
  );
}

function ManageEmailPreview({
  mode,
  model,
  group,
  placementChanges,
  additionalLines,
  emailEdits,
  onEmailChange,
}: {
  mode: 'update' | 'additional' | 'combined';
  model: EditModel;
  group: ProjectRequest[];
  placementChanges: Array<{ field: string; from?: string; to?: string }>;
  additionalLines: EditLine[];
  emailEdits: { to: string; cc: string };
  onEmailChange: (patch: Partial<{ to: string; cc: string }>) => void;
}) {
  const hasAdditional = additionalLines.length > 0;
  const subject = mode === 'additional'
    ? `Additional Project Request - ${model.programmeCentre}`
    : `Project Request Update - ${model.programmeCentre}`;
  const rows = model.lines.map(line => ({
    label: line.internCategory,
    calendarPeriod: line.calendarPeriod,
    duration: line.duration,
    placements: line.placements,
  }));
  const deadlineChange = group[0]?.deadline !== model.deadline
    ? `Response deadline: ${fmtDate(group[0]?.deadline ?? '')} -> ${fmtDate(model.deadline)}`
    : '';
  const changeLines = [
    deadlineChange,
    ...placementChanges.map(change => `${change.field}: ${change.from} -> ${change.to}`),
  ].filter(Boolean);
  const before = mode !== 'additional'
    ? [
      `Dear ${recipientLabel(model.pcHead)},`,
      '',
      `Please note the following update to the project request for ${model.programmeCentre}:`,
      ...changeLines.map(line => `- ${line}`),
      ...(hasAdditional ? ['- Additional intern categories are included below.'] : []),
      '',
      'The updated placement requirements are shown below:',
    ].join('\n')
    : [
      `Dear ${recipientLabel(model.pcHead)},`,
      '',
      `I am sending an additional project request for ${model.programmeCentre}.`,
      '',
      'Please find the additional placement requirements below:',
    ].join('\n');
  const after = [
    `Please submit your project proposals by ${fmtDate(model.deadline)}.`,
    '',
    'Thank you for your continued support.',
    '',
    'Warm regards,',
    'Davina Tan',
    'Internship Officer, DSTA',
  ].join('\n');
  const [subjectDraft, setSubjectDraft] = useState(subject);
  const [beforeDraft, setBeforeDraft] = useState(before);
  const [afterDraft, setAfterDraft] = useState(after);

  return (
    <>
    <p className="text-body-sm text-fg-muted">The recipients, subject and message below are editable. Click into a field to customise the email before sending. The placement requirements table is generated automatically.</p>
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="space-y-3">
        <label className="flex items-start gap-3 border-b border-border pb-3">
          <span className="w-16 shrink-0 pt-2 text-body-sm font-medium text-fg-muted">To</span>
          <Combobox
            selected={parseCcList(emailEdits.to)}
            onToggle={(val: string) => {
              const current = new Set(parseCcList(emailEdits.to));
              if (current.has(val)) current.delete(val); else current.add(val);
              onEmailChange({ to: Array.from(current).join(', ') });
            }}
            options={[recipientLabel(model.pcHead)].filter(Boolean)}
            placeholder="Select recipients"
            chips="inline-text"
            hideSearch
            className="flex-1"
          />
        </label>
        <label className="flex items-start gap-3 border-b border-border pb-3">
          <span className="w-16 shrink-0 pt-2 text-body-sm font-medium text-fg-muted">Cc</span>
          <Combobox
            selected={parseCcList(emailEdits.cc)}
            onToggle={(val: string) => {
              const current = new Set(parseCcList(emailEdits.cc));
              if (current.has(val)) current.delete(val); else current.add(val);
              onEmailChange({ cc: Array.from(current).join(', ') });
            }}
            options={[recipientLabel(model.adpnc), ...HQ_CC_RECIPIENTS].filter(Boolean)}
            placeholder="Select recipients"
            chips="inline-text"
            hideSearch
            className="flex-1"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Subject</span>
          <input
            value={subjectDraft}
            onChange={event => setSubjectDraft(event.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-1 text-body-sm font-medium text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
          />
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
            <Paperclip size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-fg">{TEMPLATE_FILENAME}</p>
            <p className="text-caption text-fg-muted">Project-submission template — pre-structured with the requested intern categories &amp; calendar periods.</p>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Download size={14} />Download
          </Button>
        </div>
      </div>
    </div>
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <label className="block">
        <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Opening message</span>
        <textarea
          value={beforeDraft}
          onChange={event => setBeforeDraft(event.target.value)}
          rows={Math.max(2, beforeDraft.split('\n').length)}
          className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 font-sans text-body-sm leading-6 text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
      </label>
      <div className="rounded-lg border border-border bg-bg-subtle p-4">
        <PlacementsTable rows={rows} />
      </div>
      {hasAdditional && (
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <div className="mb-2 text-table-header text-fg-muted">Additional placement requirements</div>
          <PlacementsTable
            placementsHeader="Number"
            rows={additionalLines.map(line => ({
              label: line.internCategory,
              calendarPeriod: line.calendarPeriod,
              duration: line.duration,
              placements: line.placements,
            }))}
          />
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Closing message</span>
        <textarea
          value={afterDraft}
          onChange={event => setAfterDraft(event.target.value)}
          rows={Math.max(2, afterDraft.split('\n').length)}
          className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 font-sans text-body-sm leading-6 text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
      </label>
    </div>
    </>
  );
}

export default function ProjectRequestEditPage() {
  const router = useRouter();
  const params = useParams();
  const routeKey = decodeRouteParam(params.id);
  const { profile } = useRole();
  const { setDirty, safeNavigate } = useUnsavedChanges();
  const { toast, showToast } = useToast();
  const initialSnapshot = useRef<string | null>(null);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [model, setModel] = useState<EditModel | null>(null);
  const [extraDraftModels, setExtraDraftModels] = useState<EditModel[]>([]);
  const [additionalLines, setAdditionalLines] = useState<EditLine[]>([
    { id: 'additional-1', internCategory: '', calendarPeriod: '', calendarStart: '', calendarEnd: '', duration: '', placements: 1, customWindow: false },
  ]);
  const [logs, setLogs] = useState<ProjectRequestAuditEntry[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);
  const [auditOpen, setAuditOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'update' | 'additional' | 'combined' | null>(null);
  const [draftPreviewModel, setDraftPreviewModel] = useState<EditModel | null>(null);
  const [previewEmailEdits, setPreviewEmailEdits] = useState<{ to: string; cc: string }>({ to: '', cc: '' });
  function patchPreviewEmailEdits(patch: Partial<{ to: string; cc: string }>) {
    setPreviewEmailEdits(prev => ({ ...prev, ...patch }));
  }
  const [draftConfirmSendOpen, setDraftConfirmSendOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [deleteDraftIndex, setDeleteDraftIndex] = useState<number | null>(null);

  const group = useMemo(() => {
    if (!routeKey) return [];
    const exact = requests.filter(req => req.id === routeKey || req.uploadToken === routeKey);
    if (exact.length > 0) {
      const first = exact[0];
      if (first.uploadToken) return requests.filter(req => req.uploadToken === first.uploadToken);
      if (isDraft(first)) {
        const draftKey = draftRequestGroupKey(first);
        return requests.filter(req => isDraft(req) && draftRequestGroupKey(req) === draftKey);
      }
      return exact;
    }
    return requests.filter(req => requestKey(req) === routeKey);
  }, [requests, routeKey]);

  const mode: RequestMode = group.every(isDraft) ? 'draft' : 'open';
  const openStatus = group.reduce<DisplayRequestStatus>(
    (worst, req) => {
      const status = requestDisplayStatus(req);
      const order: Record<DisplayRequestStatus, number> = { draft: 0, pending: 1, incomplete: 2, fulfilled: 3, closed: 4 };
      return order[status] < order[worst] ? status : worst;
    },
    group[0] ? requestDisplayStatus(group[0]) : 'draft',
  );
  const canManageOpen = mode === 'open' && (openStatus === 'pending' || openStatus === 'incomplete');
  const auditKey = group[0]?.uploadToken || group[0]?.id || routeKey;
  const draftModels = model ? [model, ...extraDraftModels] : [];
  const activeDraftModel = draftModels[Math.min(activeDraftIndex, Math.max(0, draftModels.length - 1))];
  const missing = draftModels.flatMap((item, index) =>
    missingFields(item).map(field => `Request ${index + 1}: ${field}`),
  );
  const additionalMissing = additionalLines.length === 0 || additionalLines.some(line =>
    !line.internCategory || !line.calendarPeriod || !line.duration || line.placements < 1
  );

  useEffect(() => {
    const loadedRequests = loadRequests();
    setRequests(loadedRequests);
  }, []);

  useEffect(() => {
    if (group.length === 0) return;
    setModel(modelFromRequests(group));
    setExtraDraftModels([]);
    initialSnapshot.current = null;
    setDirty(false);
  }, [group]);

  useEffect(() => {
    if (!model) return;
    const snapshot = dirtySnapshot();
    if (initialSnapshot.current === null) {
      initialSnapshot.current = snapshot;
      setDirty(false);
      return;
    }
    setDirty(snapshot !== initialSnapshot.current);
  }, [model, extraDraftModels, additionalLines, mode, setDirty]);

  useEffect(() => () => setDirty(false), [setDirty]);

  useEffect(() => {
    if (!auditKey) return;
    setLogs(loadRequestAuditLogs().filter(log => log.requestKey === auditKey));
  }, [auditKey]);

  useEffect(() => {
    if (activeDraftIndex >= draftModels.length) {
      setActiveDraftIndex(Math.max(0, draftModels.length - 1));
    }
  }, [activeDraftIndex, draftModels.length]);

  function updateDraftModel(index: number, next: EditModel) {
    if (index === 0) {
      setModel(next);
      return;
    }
    setExtraDraftModels(prev => prev.map((draft, draftIndex) => draftIndex === index - 1 ? next : draft));
  }

  function removeDraftModel(index: number) {
    if (index <= 0) return;
    setExtraDraftModels(prev => prev.filter((_, draftIndex) => draftIndex !== index - 1));
    setActiveDraftIndex(prev => Math.max(0, Math.min(prev, draftModels.length - 2)));
  }

  function addDraftModel() {
    setExtraDraftModels(prev => [...prev, emptyDraftModel()]);
    setActiveDraftIndex(draftModels.length);
  }

  useEffect(() => {
    if (!auditKey || mode !== 'open' || group.length === 0) return;
    const allLogs = loadRequestAuditLogs();
    const hasSentBaseline = allLogs.some(log => log.requestKey === auditKey && log.action === 'sent');
    if (hasSentBaseline) return;
    const first = group[0];
    const baseline: ProjectRequestAuditEntry = {
      id: `audit-baseline-${auditKey}`,
      requestKey: auditKey,
      action: 'sent',
      actor: first.senderName || profile.name,
      at: first.sentDate ? new Date(`${first.sentDate}T09:00:00`).toISOString() : new Date().toISOString(),
      summary: 'Request sent',
      changes: [
        { field: 'Programme Centre', to: first.programmeCenter || programmeCentreForPcHead(first.pc) },
        { field: 'PC Head', to: first.headName || recipientLabel(first.pc) },
        { field: 'Response deadline', to: fmtDate(first.deadline) },
        { field: 'Intern categories', to: String(group.length) },
      ],
    };
    saveRequestAuditLogs([baseline, ...allLogs]);
    setLogs([baseline, ...allLogs.filter(log => log.requestKey === auditKey)]);
  }, [auditKey, group, mode, profile.name]);

  function refreshAudit() {
    setLogs(loadRequestAuditLogs().filter(log => log.requestKey === auditKey));
  }

  const placementChanges = model ? group.flatMap(req => {
    const line = model.lines.find(item => item.requestId === req.id);
    if (!line || line.placements === req.placements) return [];
    return [{
      field: `${req.internCategory ?? req.educationLevel} placements`,
      from: String(req.placements),
      to: String(line.placements),
    }];
  }) : [];
  const deadlineChanged = !!model && group.length > 0 && group[0].deadline !== model.deadline;
  const hasAdditionalLines = additionalLines.some(line => line.internCategory || line.calendarPeriod || line.duration || line.placements !== 1);
  const completedAdditionalLines = additionalLines.filter(line =>
    line.internCategory && line.calendarPeriod && line.duration && line.placements >= 1
  );
  const hasPendingUpdate = deadlineChanged || placementChanges.length > 0;

  function dirtySnapshot() {
    if (!model) return '';
    return JSON.stringify({
      mode,
      draftModels,
      additionalLines: mode === 'open' ? additionalLines : [],
    });
  }

  function markClean() {
    initialSnapshot.current = dirtySnapshot();
    setDirty(false);
  }

  function markCleanWith(nextAdditionalLines = additionalLines) {
    if (!model) {
      setDirty(false);
      return;
    }
    initialSnapshot.current = JSON.stringify({
      mode,
      draftModels,
      additionalLines: mode === 'open' ? nextAdditionalLines : [],
    });
    setDirty(false);
  }

  function navigateToRequests() {
    safeNavigate('/requests');
  }

  function openPreview(mode: 'update' | 'additional' | 'combined') {
    if (mode === 'update' && !hasPendingUpdate) {
      showToast('No deadline or placement changes to preview.');
      return;
    }
    if (mode === 'additional' && additionalMissing) {
      showToast('Complete the additional intern category before previewing.');
      return;
    }
    if (mode === 'combined' && !hasPendingUpdate && !hasAdditionalLines) {
      showToast('No request updates to preview.');
      return;
    }
    if (mode === 'combined' && hasAdditionalLines && additionalMissing) {
      showToast('Complete the additional intern category before previewing.');
      return;
    }
    if (model) {
      setPreviewEmailEdits({
        to: recipientLabel(model.pcHead),
        cc: [model.adpnc ? recipientLabel(model.adpnc) : '', ...HQ_CC_RECIPIENTS].filter(Boolean).join(', '),
      });
    }
    setPreviewMode(mode);
  }

  function requestsFromModel(item: EditModel, seed: ProjectRequest, token: string | undefined, sentDate: string, idPrefix: string) {
    return item.lines.map((line, index): ProjectRequest => ({
      ...(line.requestId ? group.find(req => req.id === line.requestId) ?? seed : seed),
      id: line.requestId ?? `${idPrefix}-${Date.now()}-${index}`,
      uploadToken: token,
      pc: item.pcHead,
      programmeCenter: item.programmeCentre,
      headName: item.headName || recipientLabel(item.pcHead),
      senderName: profile.name,
      internCategory: line.internCategory,
      educationLevel: toEducationLevel(line.internCategory),
      calendarPeriod: line.calendarPeriod,
      periodStart: line.calendarStart || undefined,
      periodEnd: line.calendarEnd || undefined,
      duration: line.duration,
      placements: line.placements,
      created: 0,
      uploaded: 0,
      sentDate,
      deadline: item.deadline,
      status: 'pending' as RequestStatus,
    }));
  }

  function saveDraft() {
    if (!model || group.length === 0) return;
    const updatedGroup = draftModels.flatMap(item => requestsFromModel(item, group[0], undefined, '', 'draft-request'));
    const groupIds = new Set(group.map(req => req.id).filter(Boolean));
    const next = [...updatedGroup, ...requests.filter(req => !req.id || !groupIds.has(req.id))];
    saveRequests(next);
    setRequests(next);
    appendAudit({
      requestKey: auditKey,
      action: 'draft-saved',
      actor: profile.name,
      summary: 'Draft saved',
    });
    refreshAudit();
    markCleanWith();
    showToast('Draft saved.');
  }

  function sendDraft() {
    if (!model || group.length === 0) return;
    setDraftConfirmSendOpen(false);
    if (missing.length > 0) {
      showToast(`Complete ${missing[0]} before sending.`);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const groupIds = new Set(group.map(req => req.id).filter(Boolean));
    const sent = draftModels.flatMap((item, itemIndex) => {
      const token = `upload_${Date.now()}_${itemIndex}_${Math.random().toString(36).slice(2, 7)}`;
      return requestsFromModel(item, group[0], token, today, 'req');
    });
    const next = [...sent, ...requests.filter(req => !req.id || !groupIds.has(req.id))];
    saveRequests(next);
    appendAudit({
      requestKey: sent[0]?.uploadToken ?? auditKey,
      action: 'sent',
      actor: profile.name,
      summary: `${draftModels.length} request${draftModels.length === 1 ? '' : 's'} sent`,
      changes: [{ field: 'Status', from: 'Draft', to: 'Open' }],
    });
    sent.forEach(line => {
      addNotification({
        forRole: 'ad-pnc',
        title: `New project request - ${line.internCategory}`,
        body: `${profile.name} has sent a project request for ${line.internCategory} (${line.placements} placement${line.placements !== 1 ? 's' : ''}). Deadline: ${fmtDate(line.deadline)}.`,
        href: '/submissions',
        tier: 'action',
      });
    });
    sessionStorage.setItem('dsta_pending_toast', 'Draft sent.');
    setDirty(false);
    router.push('/requests');
  }

  function sendAdditionalRequest() {
    if (!model || group.length === 0) return;
    if (!canManageOpen) {
      showToast('Fulfilled requests are view-only.');
      return;
    }
    if (additionalMissing) {
      showToast('Complete the additional intern category before sending.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    // Additional intern categories join the existing request (same upload token, so
    // same group) — they update that request rather than registering as a new one.
    const token = group[0].uploadToken || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const additionalReqs: ProjectRequest[] = additionalLines.map((line, index) => ({
      ...group[0],
      id: `req-additional-${Date.now()}-${index}`,
      uploadToken: token,
      pc: model.pcHead,
      programmeCenter: model.programmeCentre,
      headName: model.headName || recipientLabel(model.pcHead),
      senderName: profile.name,
      internCategory: line.internCategory,
      educationLevel: toEducationLevel(line.internCategory),
      calendarPeriod: line.calendarPeriod,
      periodStart: line.calendarStart || undefined,
      periodEnd: line.calendarEnd || undefined,
      duration: line.duration,
      placements: line.placements,
      created: 0,
      uploaded: 0,
      sentDate: today,
      deadline: model.deadline,
      status: 'pending',
    }));
    const next = [...additionalReqs, ...requests];
    saveRequests(next);
    setRequests(next);
    appendAudit({
      requestKey: auditKey,
      action: 'sent',
      actor: profile.name,
      summary: `${additionalReqs.length} additional intern categor${additionalReqs.length === 1 ? 'y' : 'ies'} sent`,
      changes: additionalReqs.map(req => ({ field: 'Intern category', to: req.internCategory ?? req.educationLevel })),
    });
    additionalReqs.forEach(req => {
      addNotification({
        forRole: 'ad-pnc',
        title: `Additional project request - ${req.internCategory}`,
        body: `${profile.name} has sent an additional request for ${req.internCategory} (${req.placements} placement${req.placements !== 1 ? 's' : ''}). Deadline: ${fmtDate(req.deadline)}.`,
        href: '/submissions',
        tier: 'action',
      });
    });
    const emptyAdditional = [{ id: `additional-${Date.now()}`, internCategory: '', calendarPeriod: '', calendarStart: '', calendarEnd: '', duration: '', placements: 1 }];
    setAdditionalLines(emptyAdditional);
    refreshAudit();
    setPreviewMode(null);
    markCleanWith(emptyAdditional);
    showToast('Additional request sent.');
  }

  function saveOpenChanges() {
    if (!model || group.length === 0) return;
    if (!canManageOpen) {
      showToast('Fulfilled requests are view-only.');
      return;
    }
    const oldDeadline = group[0].deadline;
    const groupIds = new Set(group.map(req => req.id).filter(Boolean));
    const groupTokens = new Set(group.map(req => req.uploadToken).filter(Boolean));
    const linesById = new Map(model.lines.map(line => [line.requestId, line]));
    const next = requests.map(req => {
      const inGroup = (req.id && groupIds.has(req.id)) || (req.uploadToken && groupTokens.has(req.uploadToken));
      const matchingLine = req.id ? linesById.get(req.id) : undefined;
      return inGroup ? { ...req, deadline: model.deadline, placements: matchingLine?.placements ?? req.placements } : req;
    });
    saveRequests(next);
    setRequests(next);
    saveAuditEntries([
      ...(oldDeadline !== model.deadline ? [{
        requestKey: auditKey,
        action: 'deadline-updated' as const,
        actor: profile.name,
        summary: 'Response deadline updated',
        changes: [{ field: 'Response deadline', from: fmtDate(oldDeadline), to: fmtDate(model.deadline) }],
      }] : []),
      ...(placementChanges.length > 0 ? [{
        requestKey: auditKey,
        action: 'placements-updated' as const,
        actor: profile.name,
        summary: 'Placements updated',
        changes: placementChanges,
      }] : []),
    ]);
    refreshAudit();
    setPreviewMode(null);
    markCleanWith();
    showToast(placementChanges.length > 0 || oldDeadline !== model.deadline ? 'Request changes saved.' : 'No changes to save.');
  }

  function sendReminder() {
    if (!model) return;
    if (!canManageOpen) {
      showToast('Fulfilled requests are view-only.');
      return;
    }
    addNotification({
      forRole: 'ad-pnc',
      title: `Project request reminder - ${model.programmeCentre}`,
      body: `Reminder sent to ${recipientLabel(model.pcHead)}. Response deadline: ${fmtDate(model.deadline)}.`,
      href: '/submissions',
      tier: 'action',
    });
    appendAudit({
      requestKey: auditKey,
      action: 'reminder-sent',
      actor: profile.name,
      summary: 'Reminder sent',
    });
    refreshAudit();
    showToast(`Reminder sent to ${recipientLabel(model.pcHead)}.`);
  }

  function sendCombinedUpdate() {
    if (!model || group.length === 0) return;
    if (!canManageOpen) {
      showToast('Fulfilled requests are view-only.');
      return;
    }
    if (hasAdditionalLines && additionalMissing) {
      showToast('Complete the additional intern category before sending.');
      return;
    }
    if (!hasPendingUpdate && !hasAdditionalLines) {
      showToast('No request updates to send.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const oldDeadline = group[0].deadline;
    const groupIds = new Set(group.map(req => req.id).filter(Boolean));
    const groupTokens = new Set(group.map(req => req.uploadToken).filter(Boolean));
    const linesById = new Map(model.lines.map(line => [line.requestId, line]));
    const updatedExisting = requests.map(req => {
      const inGroup = (req.id && groupIds.has(req.id)) || (req.uploadToken && groupTokens.has(req.uploadToken));
      const matchingLine = req.id ? linesById.get(req.id) : undefined;
      return inGroup ? { ...req, deadline: model.deadline, placements: matchingLine?.placements ?? req.placements } : req;
    });
    // Newly-added intern categories join the existing request (same upload token /
    // group), so they update that request rather than registering as a new one.
    const token = group[0].uploadToken || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const additionalReqs: ProjectRequest[] = completedAdditionalLines.map((line, index) => ({
      ...group[0],
      id: `req-additional-${Date.now()}-${index}`,
      uploadToken: token,
      pc: model.pcHead,
      programmeCenter: model.programmeCentre,
      headName: model.headName || recipientLabel(model.pcHead),
      senderName: profile.name,
      internCategory: line.internCategory,
      educationLevel: toEducationLevel(line.internCategory),
      calendarPeriod: line.calendarPeriod,
      periodStart: line.calendarStart || undefined,
      periodEnd: line.calendarEnd || undefined,
      duration: line.duration,
      placements: line.placements,
      created: 0,
      uploaded: 0,
      sentDate: today,
      deadline: model.deadline,
      status: 'pending',
    }));
    saveRequests([...additionalReqs, ...updatedExisting]);
    setRequests([...additionalReqs, ...updatedExisting]);
    saveAuditEntries([
      ...(oldDeadline !== model.deadline ? [{
        requestKey: auditKey,
        action: 'deadline-updated' as const,
        actor: profile.name,
        summary: 'Response deadline updated',
        changes: [{ field: 'Response deadline', from: fmtDate(oldDeadline), to: fmtDate(model.deadline) }],
      }] : []),
      ...(placementChanges.length > 0 ? [{
        requestKey: auditKey,
        action: 'placements-updated' as const,
        actor: profile.name,
        summary: 'Placements updated',
        changes: placementChanges,
      }] : []),
      ...(additionalReqs.length > 0 ? [{
        requestKey: auditKey,
        action: 'sent' as const,
        actor: profile.name,
        summary: `${additionalReqs.length} additional intern categor${additionalReqs.length === 1 ? 'y' : 'ies'} sent`,
        changes: additionalReqs.map(req => ({ field: 'Intern category', to: req.internCategory ?? req.educationLevel })),
      }] : []),
    ]);
    additionalReqs.forEach(req => {
      addNotification({
        forRole: 'ad-pnc',
        title: `Additional project request - ${req.internCategory}`,
        body: `${profile.name} has sent an additional request for ${req.internCategory} (${req.placements} placement${req.placements !== 1 ? 's' : ''}). Deadline: ${fmtDate(req.deadline)}.`,
        href: '/submissions',
        tier: 'action',
      });
    });
    const emptyAdditional = [{ id: `additional-${Date.now()}`, internCategory: '', calendarPeriod: '', calendarStart: '', calendarEnd: '', duration: '', placements: 1 }];
    setAdditionalLines(emptyAdditional);
    refreshAudit();
    setPreviewMode(null);
    markCleanWith(emptyAdditional);
    sessionStorage.setItem('dsta_pending_toast', 'Request update sent.');
    sessionStorage.setItem('dsta_requests_target_tab', 'open');
    router.push('/requests');
  }

  function handlePreviewSend() {
    if (previewMode === 'update') saveOpenChanges();
    if (previewMode === 'additional') sendAdditionalRequest();
    if (previewMode === 'combined') sendCombinedUpdate();
  }

  if (requests.length > 0 && group.length === 0) {
    return (
      <Shell activeRoute="/requests">
        <div className="py-16">
          <EmptyState icon={Eye} title="Request not found" description="This project request may have been deleted." />
        </div>
      </Shell>
    );
  }

  return (
    <Shell activeRoute="/requests">
      <div className="flex min-h-[calc(100vh-112px)] flex-col space-y-5">
        <Breadcrumb className="text-label-md">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/requests"
                onClick={event => {
                  event.preventDefault();
                  navigateToRequests();
                }}
              >
                Project Requests
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{mode === 'draft' ? 'Edit Draft' : canManageOpen ? 'Edit Request' : 'View Request'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {mode !== 'draft' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-headline-lg text-fg">
                  {canManageOpen ? 'Edit Project Request' : 'View Project Request'}
                </h1>
                <Badge variant={STATUS_PILL[openStatus].variant}>{STATUS_PILL[openStatus].label}</Badge>
              </div>
              <p className="text-body-sm text-fg-muted">
                {canManageOpen
                  ? 'Open requests keep submitted fields controlled. You can update placements, add intern categories, extend the deadline, and send reminders.'
                  : 'Fulfilled requests are view-only.'}
              </p>
            </div>
          </div>
        )}

        {mode !== 'draft' && <StepIndicator step={step} mode={mode} onStepClick={setStep} />}

        {mode === 'draft' && step === 1 && (
          <Alert variant="default" className="mb-6 shrink-0 bg-[#F3EFE5] border-[#E7E4DD]">
            <Info size={16} className="shrink-0 text-fg-muted" />
            <AlertDescription>
              Add or select a request from the left panel. Complete the details on the right.
            </AlertDescription>
          </Alert>
        )}

        {model && mode === 'open' && (
          <LatestActivity log={logs[0]} onOpen={() => setAuditOpen(true)} />
        )}

        {model && (
          <div className="flex-1 min-h-[560px] space-y-5">
            {mode === 'draft' ? (
              <>
              {step === 1 ? (
                <section className="grid min-h-[560px] min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                  <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border bg-surface shadow-lg lg:overflow-visible lg:border-b-0 lg:border-r">
                    <div className="space-y-3 border-b border-border bg-surface px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-label-lg font-semibold text-fg">Requests</h2>
                          <p className="mt-0.5 text-caption text-fg-muted">
                            {draftModels.length} request{draftModels.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button size="sm" onClick={addDraftModel}><Plus size={14} />Add Project Request</Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_64px] border-b border-border bg-[#FDFCFA] px-4 py-3 text-caption text-fg-muted">
                      <span>Request</span>
                      <span className="flex items-center justify-end gap-1">
                        Status
                        <FieldHelpTooltip label="Missing">{MISSING_CHECK_HELP}</FieldHelpTooltip>
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-col">
                      {draftModels.map((item, index) => {
                        const active = index === activeDraftIndex;
                        const requestMissing = missingFields(item).length;
                        const filled = item.lines.filter(line => line.internCategory).length;
                        const placements = item.lines.reduce((sum, line) => sum + Math.max(0, line.placements || 0), 0);
                        return (
                          <div
                            key={index}
                            className={cn(
                              'group relative box-border w-full min-w-0 border-b border-border px-4 py-3 transition-colors',
                              active
                                ? 'z-10 border-y border-[#E7E4DD] bg-[#F4F2EC] before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-[#E7E4DD] after:absolute after:right-[-14px] after:top-1/2 after:h-7 after:w-4 after:-translate-y-1/2 after:bg-[#F4F2EC] after:[clip-path:polygon(0_0,100%_50%,0_100%)]'
                                : 'bg-surface hover:bg-bg-muted',
                            )}
                          >
                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setActiveDraftIndex(index)}
                                className={cn('min-w-0 text-left', active && 'pr-3')}
                              >
                                <span className="block truncate text-body-sm font-semibold text-fg">
                                  Request {index + 1} - {item.programmeCentre || 'Start editing'}
                                </span>
                                <span className="mt-1 block truncate text-caption text-fg-muted">
                                  {filled} intern categor{filled === 1 ? 'y' : 'ies'} · {placements} placement{placements === 1 ? '' : 's'}
                                </span>
                              </button>
                              <div className="flex items-center justify-end gap-1">
                                <div className="flex min-w-5 justify-end">
                                  {showErrors && (
                                    requestMissing > 0 ? (
                                      <Tooltip>
                                        <TooltipTrigger
                                          render={
                                            <button
                                              type="button"
                                              aria-label={`${requestMissing} missing field input${requestMissing !== 1 ? 's' : ''}`}
                                              className="inline-flex items-center justify-center text-danger transition-colors hover:text-danger/80 focus:outline-none focus:ring-2 focus:ring-danger/30"
                                            >
                                              <AlertCircle size={15} />
                                            </button>
                                          }
                                        />
                                        <TooltipContent side="top" align="center">
                                          {requestMissing} missing field input{requestMissing !== 1 ? 's' : ''}
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Check size={15} className="text-success" aria-label="Complete" />
                                    )
                                  )}
                                </div>
                                <div className="flex h-7 w-7 items-center justify-center hidden">
                                  {draftModels.length > 1 && index > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setDeleteDraftIndex(index)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-muted opacity-0 transition-colors hover:bg-danger-bg hover:text-danger focus:opacity-100 group-hover:opacity-100"
                                      aria-label={`Remove request ${index + 1}`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </aside>

                  <section className="flex min-h-0 min-w-0 flex-col bg-surface">
                    <div className="flex flex-col gap-3 border-b border-[#E7E4DD] bg-[#F9F8F4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-label-md font-semibold text-[#0F172B]">
                        Current Editing - Request {activeDraftIndex + 1}
                      </h3>
                      {activeDraftModel && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={draftModels.length <= 1}
                          onClick={() => setDeleteDraftIndex(activeDraftIndex)}
                        >
                          <Trash2 size={14} />Delete
                        </Button>
                      )}
                    </div>
                    {activeDraftModel && (
                      <div className="p-1">
                        <RequestEditor
                          model={activeDraftModel}
                          mode="draft"
                          title={`Request ${activeDraftIndex + 1}`}
                          description="Complete the request, then review it before sending."
                          canEditDeadline
                          canEditPlacements
                          showErrors={showErrors}
                          onChange={next => updateDraftModel(activeDraftIndex, next)}
                        />
                      </div>
                    )}
                  </section>
                </section>
              ) : (
                <div>
                  <Alert variant="default" className="mb-4 bg-[#F3EFE5] border-[#E7E4DD]">
                    <Clock className="text-fg-muted" />
                    <AlertDescription>
                      Automatic reminders will be sent {AUTO_REMINDER_DAYS.join(' and ')} days before the deadline.
                    </AlertDescription>
                  </Alert>
                  <section className="grid min-h-[560px] min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                    <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border bg-surface shadow-lg lg:overflow-visible lg:border-b-0 lg:border-r">
                      <div className="space-y-3 border-b border-border bg-surface px-4 py-3.5">
                        <div>
                          <h2 className="text-label-lg font-semibold text-fg">Requests</h2>
                          <p className="mt-0.5 text-caption text-fg-muted">
                            {draftModels.length} request{draftModels.length !== 1 ? 's' : ''} · ready to send
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_64px] border-b border-border bg-[#FDFCFA] px-4 py-3 text-caption text-fg-muted">
                        <span>Request</span>
                        <span className="text-right">Status</span>
                      </div>
                      <div className="flex min-w-0 flex-col">
                        {draftModels.map((item, index) => {
                          const active = index === activeDraftIndex;
                          const filled = item.lines.filter(line => line.internCategory).length;
                          const placements = item.lines.reduce((sum, line) => sum + Math.max(0, line.placements || 0), 0);
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setActiveDraftIndex(index)}
                              className={cn(
                                'relative grid min-w-0 grid-cols-[minmax(0,1fr)_64px] items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors',
                                active
                                  ? 'z-10 border-y border-[#E7E4DD] bg-[#F4F2EC] before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#E7E4DD] after:absolute after:right-[-14px] after:top-1/2 after:h-7 after:w-4 after:-translate-y-1/2 after:bg-[#F4F2EC] after:[clip-path:polygon(0_0,100%_50%,0_100%)]'
                                  : 'bg-surface hover:bg-bg-muted',
                              )}
                            >
                              <span className={cn('min-w-0', active && 'pr-3')}>
                                <span className="block truncate text-body-sm font-semibold text-fg">
                                  Request {index + 1} - {item.programmeCentre || 'Start editing'}
                                </span>
                                <span className="mt-1 block truncate text-caption text-fg-muted">
                                  {filled} intern categor{filled === 1 ? 'y' : 'ies'} · {placements} placement{placements === 1 ? '' : 's'}
                                </span>
                              </span>
                              <span className="flex justify-end">
                                <Check size={15} className="text-success" aria-label="Ready" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </aside>
                    <section className="flex min-h-0 min-w-0 flex-col bg-surface">
                      <div className="flex flex-col gap-1 border-b border-[#E7E4DD] bg-[#F9F8F4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-label-md font-semibold text-[#0F172B]">
                            Review - Request {activeDraftIndex + 1}
                          </h3>
                          <p className="mt-0.5 text-caption text-fg-muted">Check the request before sending.</p>
                        </div>
                      </div>
                      {activeDraftModel ? (
                        <DraftReviewDetails model={activeDraftModel} onPreview={() => {
                          setDraftPreviewModel(activeDraftModel);
                          setPreviewEmailEdits({
                            to: recipientLabel(activeDraftModel.adpnc),
                            cc: [activeDraftModel.pcHead ? recipientLabel(activeDraftModel.pcHead) : '', ...HQ_CC_RECIPIENTS].filter(Boolean).join(', '),
                          });
                        }} emailEdits={previewEmailEdits} />
                      ) : (
                        <div className="flex min-h-72 items-center justify-center p-6 text-body-sm text-fg-muted">
                          Select a request to review.
                        </div>
                      )}
                    </section>
                  </section>
                </div>
              )}
              </>
            ) : (
              <>
                {step === 1 ? (
                  <>
                    <RequestEditor
                      model={model}
                      mode={mode}
                      title="Request Details"
                      description="Sent request details stay controlled. Add intern categories in the same placement requirements area."
                      canEditDeadline={canManageOpen}
                      canEditPlacements={canManageOpen}
                      additionalLines={canManageOpen ? additionalLines : undefined}
                      showErrors={showErrors}
                      onChange={setModel}
                      onAdditionalLinesChange={canManageOpen ? setAdditionalLines : undefined}
                    />
                  </>
                ) : (
                  <ManageReviewPanel
                    model={model}
                    group={group}
                    deadlineChanged={deadlineChanged}
                    placementChanges={placementChanges}
                    additionalLines={completedAdditionalLines}
                    onPreview={() => openPreview('combined')}
                    emailEdits={previewEmailEdits}
                  />
                  )}
              </>
            )}
          </div>
        )}

        {model && (
          <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-2">
            <Button variant="ghost" size="md" onClick={navigateToRequests}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {mode === 'draft' ? (
                <>
                  {step === 1 ? (
                    <>
                      <Button variant="outline" size="md" onClick={saveDraft}>Save as Draft</Button>
                      <Button size="md" onClick={() => { if (missing.length > 0) { setShowErrors(true); } else { setShowErrors(false); setStep(2); } }}>Next</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="md" onClick={() => setStep(1)}>Cancel</Button>
                      <Button variant="outline" size="md" onClick={saveDraft}>Save as Draft</Button>
                      <Button size="md" onClick={() => setDraftConfirmSendOpen(true)}><Send size={16} />Confirm Send</Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {canManageOpen && (
                    step === 1 ? (
                      <>
                        <Button variant="outline" size="md" onClick={sendReminder}>Send Reminder</Button>
                        <Button size="md" onClick={() => { if (missingFields(model).length > 0 || additionalMissing) { setShowErrors(true); } else { setShowErrors(false); setStep(2); } }}><Eye size={16} />Review</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="md" onClick={() => setStep(1)}>Cancel</Button>
                        <Button size="md" onClick={() => openPreview('combined')}><Send size={16} />Confirm Send</Button>
                      </>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {model && (
        <Drawer
          open={auditOpen}
          onClose={() => setAuditOpen(false)}
          title="Audit Log"
          subtitle="Project request activity"
          width="520px"
        >
          <div className="p-5">
            <AuditLogPanel logs={logs} />
          </div>
        </Drawer>
      )}
      {model && previewMode && (
        <Sheet open onOpenChange={open => { if (!open) setPreviewMode(null); }}>
          <SheetContent side="right" className="w-[min(100vw,680px)] sm:max-w-none">
            <SheetHeader>
              <SheetTitle>Email preview</SheetTitle>
              <SheetDescription>
                {previewMode === 'additional' ? 'Additional request' : 'Request update'} — to {recipientLabel(model.pcHead)}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <ManageEmailPreview
                mode={previewMode}
                model={model}
                group={group}
                placementChanges={placementChanges}
                additionalLines={previewMode === 'additional' || previewMode === 'combined' ? completedAdditionalLines : []}
                emailEdits={previewEmailEdits}
                onEmailChange={patchPreviewEmailEdits}
              />
            </SheetBody>
            <SheetFooter>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewMode(null)}>Cancel</Button>
                <Button onClick={handlePreviewSend}>
                  <Send size={15} />{previewMode === 'additional' ? 'Send Additional Request' : 'Send Update'}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
      {draftPreviewModel && (
        <Sheet open onOpenChange={open => { if (!open) setDraftPreviewModel(null); }}>
          <SheetContent side="right" className="w-[min(100vw,680px)] sm:max-w-none">
            <SheetHeader>
              <SheetTitle>Email preview</SheetTitle>
              <SheetDescription>To {recipientLabel(draftPreviewModel.adpnc) || '-'}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <DraftEmailPreview model={draftPreviewModel} emailEdits={previewEmailEdits} onEmailChange={patchPreviewEmailEdits} />
            </SheetBody>
            <SheetFooter>
              <Button variant="primary" size="md" onClick={() => setDraftPreviewModel(null)}>Done</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
      <Dialog open={draftConfirmSendOpen} onOpenChange={setDraftConfirmSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send project request?</DialogTitle>
            <DialogDescription>
              Your project request will be sent to the Programme Centre for intern placements.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraftConfirmSendOpen(false)}>
              Stay on page
            </Button>
            <Button onClick={sendDraft}>
              <Send size={14} />Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDraftIndex !== null} onOpenChange={open => { if (!open) setDeleteDraftIndex(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Request?</DialogTitle>
            <DialogDescription>
              Deleting request will permanently remove all entered information and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDraftIndex(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => { if (deleteDraftIndex !== null) removeDraftModel(deleteDraftIndex); setDeleteDraftIndex(null); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toast message={toast} />
    </Shell>
  );
}
