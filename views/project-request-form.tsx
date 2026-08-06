'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Combobox from '@/components/ui-legacy/combobox';
import DatePicker from '@/components/ui-legacy/date-picker';
import FieldRequired from '@/components/ui-legacy/field-required';
import { DateRangePicker, type DateRange } from '@/components/date-range-picker';
import { parseISO, formatISO } from 'date-fns';
import { parseMMMYY, formatMMMYY, MONTHS, INTAKE_BASE_YEAR, DEFAULT_INTAKE_YEAR, INTAKE_YEARS, shiftMMMYY, mmmyyToISO, mmmyyToISOEnd, toMonthIndex, INTERNSHIP_WINDOWS } from '@/lib/internship-period';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui-legacy/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelectContent } from '@/components/ui-legacy/select';
import {
  Send, Eye, AlertCircle, ArrowLeft, ArrowLeftToLine, Clock, Info,
  ChevronDown, ChevronRight, ChevronsDownUp, Plus, Minus, Trash2,
  Paperclip, Download, Check, Users, ArrowUp,
} from 'lucide-react';
import { CONTACTS, toEducationLevel } from '@/lib/data';
import { downloadRequestTemplateFromXlsx } from '@/lib/request-template';
import { loadRequests, saveRequests } from '@/lib/storage';
import { cn, formatDate, sgTomorrow } from '@/lib/utils';
import { Field, FieldLabel, FieldLabelText } from '@/components/ui-legacy/field';
import { useRole, ROLE_PROFILES } from '@/lib/role';
import { addNotification } from '@/lib/notifications';
import type { RequestStatus, ProjectRequest } from '@/lib/types';

/* Filename of the project-submission Excel template attached to each request email. */
const TEMPLATE_FILENAME = 'DSTA_Project_Request_Template.xlsx';
import { useUnsavedChanges } from '@/lib/unsaved-changes';

/* Reminders are sent automatically this many days before the response deadline. */
const AUTO_REMINDER_DAYS = [14, 7];
const MISSING_CHECK_HELP = 'Missing required fields: Programme Centre, Response deadline, and Placement requirements.';
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

/* The window presets above are anchored to the base intake year; a per-request
   Intake Year shifts every preset forward, so the same seasonal windows work for a
   later cycle (e.g. Sep 2026–Feb 2027 → Sep 2027–Feb 2028). BASE_YEAR / INTAKE_YEARS
   / shiftMMMYY now live in lib/internship-period so the programme form shares them. */
const BASE_YEAR = INTAKE_BASE_YEAR;

/* ── A single request: one PC Head (To) + one AD (P&C) (Cc), a deadline, and one
   row per intern category with timing and placement count. ────────────────── */
interface ReqLevel {
  level: string;
  calendarStart: string;
  calendarEnd: string;
  calendarPeriod: string;
  duration: string;
  placements: number;
  customWindow?: boolean;   // true → free month-range picker instead of the category presets
}
interface ReqEntry {
  id:       number;
  department: 'DSTA' | 'DSO' | 'CSIT';
  programmeCentre: string;
  pcHead:   string;   // PC Head email (To)
  adpnc:    string;   // AD (P&C) email (Cc)
  deadline: string;
  levels:   ReqLevel[];
  open:     boolean;
  intakeYear: number;   // calendar year the internship windows are anchored to
}

interface EmailEdit { subject: string; before: string; after: string; to: string; cc: string; }
type BuildLayout = 'Layout 1' | 'Layout 2';
type ReadinessKey = 'programmeCentre' | 'deadline' | 'placements';

/* Recipient pools are scoped by programme centre. Users choose the programme
   centre; the PC Head and AD (P&C) are then derived from that centre. */
type RecipientDepartment = ReqEntry['department'];

function contactPcForProgrammeCentre(programmeCentre: string): string {
  if (programmeCentre === 'DSO') {
    return CONTACTS.find(c => c.title === 'Programme Centre Head' && c.department === 'DSO' && c.pc)?.pc ?? '';
  }
  return programmeCentre;
}

/* Canonical Programme Centre order (mirrors the PC dropdown in PROJECT_SUBMISSION_COLUMNS),
   so the request-form picker lists centres in the same order as the rest of the app. */
const PC_ORDER = ['AS', 'CIO', 'Cyber', 'DH', 'EDS', 'Info', 'MDS', 'PC3', 'PC4', 'PC5', 'PC6', 'PC8', 'PC9', 'PC10', 'PC11', 'SECC', 'STSH', 'CSIT'];

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

function departmentForProgrammeCentre(programmeCentre: string): RecipientDepartment {
  const pc = contactPcForProgrammeCentre(programmeCentre);
  return (CONTACTS.find(c => c.title === 'Programme Centre Head' && c.pc === pc)?.department as RecipientDepartment) ?? 'DSTA';
}

function adPncForPcHead(pcHeadEmail: string): string {
  const head = CONTACTS.find(c => c.email === pcHeadEmail);
  const pc = head?.pc;
  const department = head?.department;
  return CONTACTS.find(c => c.title === 'AD (P&C)' && c.department === department && c.pc === pc)?.email ?? '';
}

function programmeCenterForPcHead(pcHeadEmail: string): string {
  return CONTACTS.find(c => c.email === pcHeadEmail)?.pc ?? '';
}

/** Resolve a contact email to its display name, falling back to the email. */
function recipientLabel(email: string): string {
  if (!email) return '';
  return CONTACTS.find(c => c.email === email)?.name
    ?? Object.values(ROLE_PROFILES).find(p => p.email === email)?.name
    ?? email;
}

/* HQ recipients cc'd on every project-request email (it is sent from a system address,
   so the Internship HQ team is copied on every request). */
const HQ_CC_RECIPIENTS = ['Jasmine (Internship HQ)', 'Jeryn', 'Keng Yen'];

/** Parse a comma-separated Cc string into a list of names/emails. */
function parseCcList(cc: string | undefined): string[] {
  if (!cc) return [];
  return cc.split(',').map(s => s.trim()).filter(Boolean);
}

/** "Jun26" → "Jun 2026". */
function mmmyyLabel(mmmyy: string): string {
  const idx = parseMMMYY(mmmyy);
  if (idx === null) return '';
  return `${MONTHS[((idx % 12) + 12) % 12]} ${Math.floor(idx / 12)}`;
}

/** Shift an ISO day ("2026-06-01") by whole years, clamping the day to the month. */
function shiftIsoYears(iso: string, years: number): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const y = parseInt(m[1], 10) + years;
  const day = Math.min(parseInt(m[3], 10), new Date(y, parseInt(m[2], 10), 0).getDate());
  return `${y}-${m[2]}-${String(day).padStart(2, '0')}`;
}

/** Readable window label. ISO ranges show exact dates ("1 Jun 2026 – 31 Aug 2026",
   single day when start === end); legacy MMMYY values fall back to months. */
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

function calendarPeriodLabel(level: ReqLevel): string {
  const label = monthRangeLabel(level.calendarStart, level.calendarEnd);
  return label || level.calendarPeriod;
}

function emptyLevel(): ReqLevel {
  return {
    level: '',
    calendarStart: '',
    calendarEnd: '',
    calendarPeriod: '',
    duration: '',
    placements: 1,
  };
}

/** The required fields a request is still missing — drives the "N missing" badge. */
function reqMissing(r: ReqEntry): string[] {
  const m: string[] = [];
  if (!r.programmeCentre) m.push('Programme Centre');
  if (!r.deadline) m.push('Response deadline');
  if (r.levels.length === 0 || r.levels.some(l => !l.level || !l.calendarStart || !l.calendarEnd || !l.duration || l.placements < 1)) m.push('Intern category');
  return m;
}

function PlacementsTable({ intakeYear, rows }: { intakeYear: number; rows: Array<{ label: string; calendarPeriod?: string; duration?: string; placements: number }> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Internship year</TableHead>
          <TableHead>Intern Category</TableHead>
          <TableHead>Internship window</TableHead>
          <TableHead>Project duration</TableHead>
          <TableHead>Placements</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            <TableCell>{intakeYear}</TableCell>
            <TableCell>{row.label}</TableCell>
            <TableCell>{row.calendarPeriod || '-'}</TableCell>
            <TableCell>{row.duration || '-'}</TableCell>
            <TableCell>{row.placements}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ── Placement stepper ───────────────────────────────────────────── */
function Stepper({ value, onChange, onInteract }: { value: number; onChange: (n: number) => void; onInteract?: () => void }) {
  return (
    <div className="flex h-9 w-32 items-center overflow-hidden rounded-md border border-border bg-surface">
      <button
        type="button"
        onClick={() => { onChange(Math.max(1, value - 1)); onInteract?.(); }}
        className="flex h-full w-9 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        aria-label="Decrease placements"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        min={1}
        value={value === 0 ? '' : value}
        onChange={e => { const n = parseInt(e.target.value, 10); onChange(isNaN(n) ? 0 : n); }}
        onBlur={e => { const n = parseInt(e.target.value, 10); if (isNaN(n) || n < 1) onChange(1); onInteract?.(); }}
        className="h-full w-full min-w-0 border-x border-border bg-transparent text-center text-body-md text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => { onChange(value + 1); onInteract?.(); }}
        className="flex h-full w-9 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        aria-label="Increase placements"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ── Section divider — shared section-heading style across creation forms ── */
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

function RecipientChip({ email, role, badgeVariant }: { email: string; role: string; badgeVariant?: 'info' | 'neutral' | 'subtle' }) {
  return (
    <span className="inline-flex h-9 max-w-full items-center gap-2 text-sm">
      <span className="min-w-0 truncate text-sm font-medium text-fg">{recipientLabel(email)}</span>
      <Badge variant={badgeVariant || 'neutral'} className="shrink-0 text-caption font-medium">{role}</Badge>
    </span>
  );
}

function DerivedRecipients({ pcHead, adpnc, hasProgrammeCentre, ccEmails, toEmails }: { pcHead: string; adpnc: string; hasProgrammeCentre: boolean; ccEmails?: string; toEmails?: string }) {
  const [showAllRecipients, setShowAllRecipients] = useState(true);
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
          <span className="w-8 shrink-0 text-caption font-semibold uppercase tracking-wider text-fg-muted">CC</span>
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
          <span className="w-8 shrink-0 text-caption font-semibold uppercase tracking-wider text-fg-muted">CC</span>
          <Button variant="outline" size="sm" onClick={() => setShowAllRecipients(true)}>
            <Users size={14} />View {ccList.length} CC recipients
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── Request card ────────────────────────────────────────────────── */
function RequestCard({
  entry, number, onChange, onRemove, canRemove = true, guided = false, hideAddInternCategory = false, highlightedSection = null, ccEdit, toEdit, isFieldTouched, touchField, onLevelRemoved,
}: {
  entry: ReqEntry;
  number: number;
  onChange: (patch: Partial<ReqEntry>) => void;
  onRemove: () => void;
  canRemove?: boolean;
  guided?: boolean;
  hideAddInternCategory?: boolean;
  highlightedSection?: ReadinessKey | null;
  ccEdit?: string;
  toEdit?: string;
  isFieldTouched: (key: string) => boolean;
  touchField: (key: string) => void;
  onLevelRemoved: (removedIndex: number) => void;
}) {
  const filledLevels = entry.levels.filter(l => l.level).length;
  const totalPlacements = entry.levels.reduce((sum, level) => sum + Math.max(0, level.placements || 0), 0);
  const summaryParts = [
    entry.programmeCentre || 'Select Programme Centre to begin',
    entry.pcHead && recipientLabel(entry.pcHead),
    filledLevels > 0 && `${filledLevels} intern categor${filledLevels === 1 ? 'y' : 'ies'}`,
    `${totalPlacements} placement${totalPlacements === 1 ? '' : 's'}`,
  ].filter(Boolean) as string[];

  /* Per-field touched keys, scoped to this request (level fields are index-based). */
  const reqKey = (suffix: string) => `${entry.id}:${suffix}`;
  const levelKey = (idx: number, field: string) => reqKey(`level:${idx}:${field}`);

  function updateLevel(idx: number, patch: Partial<ReqLevel>) {
    onChange({ levels: entry.levels.map((l, i) => i === idx ? { ...l, ...patch } : l) });
  }
  function removeLevel(idx: number) {
    onChange({ levels: entry.levels.filter((_, i) => i !== idx) });
    onLevelRemoved(idx);
  }
  function addLevel() { onChange({ levels: [...entry.levels, emptyLevel()] }); }
  const highlightShellClass = 'rounded-md -m-2 border p-2 transition-colors';
  const highlightActiveClass = 'border-accent bg-bg';
  const highlightIdleClass = 'border-transparent';

  function highlightClassFor(section: ReadinessKey) {
    return cn(
      highlightShellClass,
      highlightedSection === section ? highlightActiveClass : highlightIdleClass,
    );
  }

  return (
    <div className={cn('border-t border-border first:border-t-0', guided && 'border-t-0')}>
      {/* Collapsed header bar */}
      {!guided && <div className="flex items-center gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={() => onChange({ open: !entry.open })}
          aria-expanded={entry.open}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-1 text-left transition-colors hover:bg-bg-subtle"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-muted">
            {entry.open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">
              Request {number} · {summaryParts.join(' · ')}
            </span>
          </span>
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger-bg hover:text-danger"
            aria-label="Remove request"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>}

      {/* Expanded body */}
      {(guided || entry.open) && (
        <div className={cn('space-y-6 px-5 pb-5', guided ? 'pt-5' : 'pt-1')}>
          {/* Recipients */}
          <div>
            <SectionDivider label="Recipients" uppercase={false} showLine={false} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:items-start">
              <Field className={highlightClassFor('programmeCentre')}>
                <FieldLabel>
                  Programme Centre <span className="text-danger">*</span>
                </FieldLabel>
                <Select
                  value={entry.programmeCentre}
                  onValueChange={value => {
                    const programmeCentre = value ?? '';
                    const pcHead = pcHeadForProgrammeCentre(programmeCentre);
                    onChange({
                      programmeCentre,
                      department: departmentForProgrammeCentre(programmeCentre),
                      pcHead,
                      adpnc: adPncForProgrammeCentre(programmeCentre),
                    });
                    touchField(reqKey('programmeCentre'));
                  }}
                  onOpenChange={open => { if (!open) touchField(reqKey('programmeCentre')); }}
                >
                  <SelectTrigger className={cn('min-w-0 overflow-hidden', isFieldTouched(reqKey('programmeCentre')) && !entry.programmeCentre && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select programme centre" /></SelectTrigger>
                  <SelectContent>
                    {programmeCentreOptions().map(option => (
                      <SelectItem key={option.value} value={option.value} disabled={option.value !== 'PC3'}>{option.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldRequired show={isFieldTouched(reqKey('programmeCentre')) && !entry.programmeCentre} />
              </Field>
              <Field className={highlightClassFor('deadline')}>
                <FieldLabel>
                  Response deadline <span className="text-danger">*</span>
                </FieldLabel>
                <DatePicker value={entry.deadline} onChange={d => { onChange({ deadline: d }); touchField(reqKey('deadline')); }} placeholder="Pick a date" align="right" minDate={sgTomorrow()} error={isFieldTouched(reqKey('deadline')) && !entry.deadline} onClose={() => touchField(reqKey('deadline'))} />
                <FieldRequired show={isFieldTouched(reqKey('deadline')) && !entry.deadline} />
              </Field>
            </div>
            <div className={cn('mt-3 grid grid-cols-1 gap-3', (entry.pcHead || entry.adpnc) ? '' : 'lg:grid-cols-2')}>
              <Field>
                <FieldLabel className="flex items-center gap-1.5">
                  {!entry.programmeCentre && <ArrowUp size={13} className="text-fg-subtle" aria-hidden="true" />}
                  Recipients
                </FieldLabel>
                <DerivedRecipients pcHead={entry.pcHead} adpnc={entry.adpnc} hasProgrammeCentre={Boolean(entry.programmeCentre)} ccEmails={ccEdit} toEmails={toEdit} />
              </Field>
            </div>
          </div>

          {/* Placement requirements */}
          <div className={highlightClassFor('placements')}>
            <SectionDivider label="Placement requirements" uppercase={false} showLine={false} />
            <div className="mb-4">
              <Field className="w-fit">
                <FieldLabel className="flex items-center gap-1.5">
                  Internship year <span className="text-danger">*</span>
                  <FieldHelpTooltip label="Internship year">The calendar year these internship windows are for — the window options shift to this year.</FieldHelpTooltip>
                </FieldLabel>
                <Select
                  value={String(entry.intakeYear ?? BASE_YEAR)}
                  onValueChange={v => {
                    if (!v) return;
                    const ny = parseInt(v, 10);
                    const dy = ny - (entry.intakeYear ?? BASE_YEAR);
                    onChange({
                      intakeYear: ny,
                      levels: entry.levels.map(l => {
                        if (l.customWindow || !l.calendarStart || !l.calendarEnd) return l;
                        const cs = shiftIsoYears(l.calendarStart, dy), ce = shiftIsoYears(l.calendarEnd, dy);
                        return { ...l, calendarStart: cs, calendarEnd: ce, calendarPeriod: monthRangeLabel(cs, ce) };
                      }),
                    });
                  }}
                >
                  <SelectTrigger className="h-9 w-28"><SelectValue className="truncate block" /></SelectTrigger>
                  <SelectContent>
                    {INTAKE_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex flex-col gap-1.5">
            {/* Column headers for the level + placements inputs */}
            <div className="hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <FieldLabelText className="flex items-center gap-1.5">
                Intern category <span className="text-danger">*</span>
                <FieldHelpTooltip label="Intern category">The type of intern the project is for</FieldHelpTooltip>
              </FieldLabelText>
              <FieldLabelText className="flex items-center gap-1.5">
                Internship window <span className="text-danger">*</span>
                <FieldHelpTooltip label="Internship window">Proposed projects should be able to run within this period</FieldHelpTooltip>
              </FieldLabelText>
              <FieldLabelText className="flex items-center gap-1.5">
                Project duration <span className="text-danger">*</span>
                <FieldHelpTooltip label="Project duration">Proposed projects should last around this length of time</FieldHelpTooltip>
              </FieldLabelText>
              <FieldLabelText>Placements <span className="text-danger">*</span></FieldLabelText>
            </div>
            <div className="space-y-2">
              {entry.levels.map((lvl, idx) => {
                // Repeats are allowed — the same intern category can be requested for
                // more than one calendar period, so categories are never disabled.
                const yearShift = (entry.intakeYear ?? BASE_YEAR) - BASE_YEAR;
                const winPresets = (INTERNSHIP_WINDOWS[lvl.level] || []).map(p => {
                  // Presets default to the 1st of the start month and last day of the end month (ISO).
                  const start = mmmyyToISO(shiftMMMYY(p.start, yearShift)), end = mmmyyToISOEnd(shiftMMMYY(p.end, yearShift));
                  return { label: monthRangeLabel(start, end), start, end };
                });
                const winCustom = !!lvl.customWindow || (!!lvl.level && winPresets.length === 0);
                const winSelected = winPresets.find(p => p.start === lvl.calendarStart && p.end === lvl.calendarEnd)?.label ?? '';
                const winStart = toMonthIndex(lvl.calendarStart), winEnd = toMonthIndex(lvl.calendarEnd);
                const winMonths = (winStart !== null && winEnd !== null && winEnd >= winStart) ? (winEnd - winStart + 1) : 0;
                const durOptions = winMonths ? DURATIONS.filter(d => parseInt(d, 10) <= winMonths) : [...DURATIONS];
                return (
                  <div key={idx} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5 lg:hidden">
                        Intern category <span className="text-danger">*</span>
                        <FieldHelpTooltip label="Intern category">The type of intern the project is for</FieldHelpTooltip>
                      </FieldLabel>
                      <Select value={lvl.level} onValueChange={v => { updateLevel(idx, { level: v ?? '', calendarStart: '', calendarEnd: '', calendarPeriod: '', customWindow: false }); touchField(levelKey(idx, 'level')); }} onOpenChange={open => { if (!open) touchField(levelKey(idx, 'level')); }}>
                        <SelectTrigger className={cn('min-w-0 overflow-hidden', isFieldTouched(levelKey(idx, 'level')) && !lvl.level && 'border-danger')}>
                          <SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select intern category" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(28rem,var(--available-width))]">
                          {INTERN_CATEGORIES.map(l => (
                            <SelectItem key={l} value={l} className="whitespace-normal leading-snug">{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldRequired show={isFieldTouched(levelKey(idx, 'level')) && !lvl.level} />
                    </Field>
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5 lg:hidden">
                        Internship window <span className="text-danger">*</span>
                        <FieldHelpTooltip label="Internship window">Options follow the selected intern category; pick Customise for a bespoke window</FieldHelpTooltip>
                      </FieldLabel>
                      {!lvl.level ? (
                        <Select disabled>
                          <SelectTrigger className={cn('min-w-0 overflow-hidden', isFieldTouched(levelKey(idx, 'calendarStart')) && !lvl.calendarStart && 'border-danger disabled:opacity-100')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select intern category first" /></SelectTrigger>
                        </Select>
                      ) : winCustom ? (
                        <div className="space-y-1">
                          <DateRangePicker
                            value={{
                              from: lvl.calendarStart ? parseISO(lvl.calendarStart) : undefined,
                              to: lvl.calendarEnd ? parseISO(lvl.calendarEnd) : undefined,
                            }}
                            onChange={(range: DateRange) => {
                              const calendarStart = range.from ? formatISO(range.from, { representation: 'date' }) : '';
                              const calendarEnd = range.to ? formatISO(range.to, { representation: 'date' }) : '';
                              const s = toMonthIndex(calendarStart), e = toMonthIndex(calendarEnd);
                              const wm = (s !== null && e !== null && e >= s) ? (e - s + 1) : 0;
                              const patch: Partial<ReqLevel> = { calendarStart, calendarEnd, calendarPeriod: monthRangeLabel(calendarStart, calendarEnd) };
                              if (wm && lvl.duration && parseInt(lvl.duration, 10) > wm) patch.duration = '';
                              updateLevel(idx, patch);
                              touchField(levelKey(idx, 'calendarStart'));
                              touchField(levelKey(idx, 'calendarEnd'));
                            }}
                            placeholder="Select start and end date"
                            hideLabels
                            hideFooter
                            onOpenChange={open => { if (!open) { touchField(levelKey(idx, 'calendarStart')); touchField(levelKey(idx, 'calendarEnd')); } }}
                            className={cn('w-full min-w-0', isFieldTouched(levelKey(idx, 'calendarStart')) && !!lvl.level && (!lvl.calendarStart || !lvl.calendarEnd) && 'border-danger')}
                          />
                          {winPresets.length > 0 && (
                            <button type="button" className="text-label-sm text-accent hover:underline hidden" onClick={() => { updateLevel(idx, { customWindow: false, calendarStart: '', calendarEnd: '', calendarPeriod: '' }); touchField(levelKey(idx, 'calendarStart')); touchField(levelKey(idx, 'calendarEnd')); }}>Use a preset window</button>
                          )}
                        </div>
                      ) : (
                        <Select
                          value={winSelected}
                          onValueChange={v => {
                            if (v === '__custom__') { updateLevel(idx, { customWindow: true, calendarStart: '', calendarEnd: '', calendarPeriod: '' }); touchField(levelKey(idx, 'calendarStart')); touchField(levelKey(idx, 'calendarEnd')); return; }
                            const p = winPresets.find(x => x.label === v);
                            if (!p) return;
                            const ps = toMonthIndex(p.start), pe = toMonthIndex(p.end);
                            const wm = (ps !== null && pe !== null) ? (pe - ps + 1) : 0;
                            const patch: Partial<ReqLevel> = { calendarStart: p.start, calendarEnd: p.end, calendarPeriod: monthRangeLabel(p.start, p.end), customWindow: false };
                            if (wm && lvl.duration && parseInt(lvl.duration, 10) > wm) patch.duration = '';
                            updateLevel(idx, patch);
                            touchField(levelKey(idx, 'calendarStart'));
                            touchField(levelKey(idx, 'calendarEnd'));
                          }}
                          onOpenChange={open => { if (!open) { touchField(levelKey(idx, 'calendarStart')); touchField(levelKey(idx, 'calendarEnd')); } }}
                        >
                          <SelectTrigger className={cn('min-w-0 overflow-hidden', isFieldTouched(levelKey(idx, 'calendarStart')) && !lvl.calendarStart && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Select internship window" /></SelectTrigger>
                          <SelectContent>
                            {winPresets.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
                            <SelectItem value="__custom__">Customise…</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <FieldRequired show={isFieldTouched(levelKey(idx, 'calendarStart')) && (!lvl.calendarStart || !lvl.calendarEnd)} />
                    </Field>
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5 lg:hidden">
                        Project duration <span className="text-danger">*</span>
                        <FieldHelpTooltip label="Project duration">Proposed projects should last around this length of time</FieldHelpTooltip>
                      </FieldLabel>
                      <Select value={lvl.duration} onValueChange={v => { updateLevel(idx, { duration: v ?? '' }); touchField(levelKey(idx, 'duration')); }} onOpenChange={open => { if (!open) touchField(levelKey(idx, 'duration')); }}>
                        <SelectTrigger className={cn('min-w-0 overflow-hidden', isFieldTouched(levelKey(idx, 'duration')) && !lvl.duration && 'border-danger')}><SelectValue className="truncate block min-w-0 flex-1 text-left" placeholder="Project duration" /></SelectTrigger>
                        <SelectContent>
                          {durOptions.map(duration => <SelectItem key={duration} value={duration}>{duration}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldRequired show={isFieldTouched(levelKey(idx, 'duration')) && !lvl.duration} />
                  </Field>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Field>
                          <FieldLabel className="lg:hidden">Placements <span className="text-danger">*</span></FieldLabel>
                          <Stepper value={lvl.placements} onChange={n => updateLevel(idx, { placements: n })} onInteract={() => touchField(levelKey(idx, 'placements'))} />
                        </Field>
                        <button
                          type="button"
                          disabled={entry.levels.length === 1}
                          onClick={() => removeLevel(idx)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-90"
                          aria-label="Remove intern category"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <FieldRequired show={isFieldTouched(levelKey(idx, 'placements')) && lvl.placements < 1} />
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
            {!hideAddInternCategory && <div className="mt-3 pt-1">
              <Button variant="outline" size="sm" onClick={addLevel}>
                <Plus size={14} />Add intern category
              </Button>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Review card (read-only summary of one request) ──────────────── */
function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <Field>
      <FieldLabel className="text-fg-muted">{label}</FieldLabel>
      <p className="text-body-md font-medium text-fg">{value || '—'}</p>
    </Field>
  );
}

function ReviewRecipientChips({ entry, ccEmails, toEmails }: { entry: ReqEntry; ccEmails?: string; toEmails?: string }) {
  const ccList = ccEmails ? parseCcList(ccEmails) : HQ_CC_RECIPIENTS;
  const toList = toEmails ? parseCcList(toEmails) : [];
  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        <span className="shrink-0 text-body-sm text-fg-muted">To:</span>
        {toList.length > 0 ? toList.map((email, i) => (
          <Fragment key={email}>
            <RecipientChip email={email} role={email === entry.pcHead ? 'PC Head' : email === entry.adpnc ? 'AD (P&C)' : ''} badgeVariant="info" />
            {i < toList.length - 1 && <span className="text-fg-muted">,</span>}
          </Fragment>
        )) : (
          <>
            {entry.pcHead && <RecipientChip email={entry.pcHead} role="PC Head" badgeVariant="info" />}
            {entry.pcHead && entry.adpnc && <span className="text-fg-muted">,</span>}
            {entry.adpnc && <RecipientChip email={entry.adpnc} role="AD (P&C)" badgeVariant="info" />}
          </>
        )}
      </div>
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        <span className="shrink-0 text-body-sm text-fg-muted">CC:</span>
        {ccList.map((name, i) => (
          <Fragment key={name}>
            <RecipientChip email={name} role="HQ" badgeVariant="subtle" />
            {i < ccList.length - 1 && <span className="text-fg-muted">,</span>}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function ReviewDetails({ entry, onPreview, ccEdit, toEdit }: { entry: ReqEntry; onPreview: () => void; ccEdit?: string; toEdit?: string }) {
  return (
    <div className="space-y-5 px-5 pb-5 pt-4">
      <div>
        <SectionDivider label="Recipients" uppercase={false} showLine={false} />
        <div className="space-y-5">
          <div className="flex w-1/2 items-stretch gap-4">
            <div className="flex-1">
              <ReviewField label="Programme Centre" value={entry.programmeCentre} />
            </div>
            <div className="w-px self-stretch bg-border" aria-hidden="true" />
            <div className="flex-1">
              <ReviewField label="Response deadline" value={entry.deadline ? formatDate(entry.deadline) : ''} />
            </div>
          </div>
          <Field>
            <FieldLabel className="text-fg-muted">Recipients</FieldLabel>
            <ReviewRecipientChips entry={entry} ccEmails={ccEdit} toEmails={toEdit} />
          </Field>
        </div>
      </div>
      <div>
        <SectionDivider label="Placement requirements" uppercase={false} showLine={false} />
        <PlacementsTable
          intakeYear={entry.intakeYear}
          rows={entry.levels.map(l => ({
            label: l.level,
            calendarPeriod: calendarPeriodLabel(l),
            duration: l.duration,
            placements: l.placements,
          }))}
        />
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={onPreview}><Eye size={15} />Preview email</Button>
      </div>
    </div>
  );
}

function ReviewCard({ entry, number, onPreview, ccEdit, toEdit }: { entry: ReqEntry; number: number; onPreview: () => void; ccEdit?: string; toEdit?: string }) {
  const [open, setOpen] = useState(true);
  const totalPlacements = entry.levels.reduce((s, l) => s + l.placements, 0);

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-muted">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-muted text-label-sm font-semibold text-fg-muted">
          {number}
        </span>
        <span className="truncate text-body-sm text-fg">
          {recipientLabel(entry.pcHead) || 'No PC Head'}
          {' · '}{entry.deadline ? formatDate(entry.deadline) : 'No deadline'}
          {' · '}{totalPlacements} placement{totalPlacements === 1 ? '' : 's'}
        </span>
      </button>
      {open && (
        <ReviewDetails entry={entry} onPreview={onPreview} ccEdit={ccEdit} toEdit={toEdit} />
      )}
    </div>
  );
}

function ReviewListLayout({
  reqs,
  activeReq,
  numberById,
  onSelect,
  onPreview,
  emailEdits,
}: {
  reqs: ReqEntry[];
  activeReq: ReqEntry | undefined;
  numberById: Map<number, number>;
  onSelect: (id: number) => void;
  onPreview: (id: number) => void;
  emailEdits: Record<number, EmailEdit>;
}) {
  return (
    <section className="grid min-h-[560px] min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border bg-surface shadow-sm lg:overflow-visible lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-border bg-surface px-4 py-3.5">
          <div>
            <h2 className="text-label-lg font-semibold text-fg">Requests</h2>
            <p className="mt-0.5 text-caption text-fg-muted">
              {reqs.length} request{reqs.length !== 1 ? 's' : ''} · ready to send
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_64px] border-b border-border px-4 py-3 text-caption text-fg-muted">
          <span>Request</span>
          <span className="text-right">Status</span>
        </div>

        <div className="flex min-w-0 flex-col">
          {reqs.map(r => {
            const number = numberById.get(r.id) ?? 0;
            const isActive = activeReq?.id === r.id;
            const totalPlacements = r.levels.reduce((sum, level) => sum + Math.max(0, level.placements || 0), 0);
            const filledLevels = r.levels.filter(l => l.level).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                className={cn(
                  'group relative box-border w-full min-w-0 border-b px-4 py-3 text-left transition-colors',
                  isActive
                    ? 'z-10 border-y border-[#E7E4DD] bg-[#F4F2EC]'
                    : 'border-border bg-surface hover:bg-bg-muted',
                )}
              >
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_64px] items-center gap-3">
                  <span className={cn('min-w-0', isActive && 'pr-3')}>
                    <span className="block truncate text-sm font-medium text-fg">
                      Request {number} - {r.programmeCentre}
                    </span>
                    <span className="mt-1 block truncate text-xs font-normal text-fg-muted">
                      {filledLevels} intern categor{filledLevels === 1 ? 'y' : 'ies'} · {totalPlacements} placement{totalPlacements === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="flex justify-end">
                    <Check size={15} className="text-success" aria-label="Ready" />
                  </span>
                </div>
                {isActive && (
                  <span
                    className="absolute right-[-11px] top-1/2 z-10 h-full w-[11px] -translate-y-1/2 bg-[length:auto_100%] bg-right bg-no-repeat"
                    style={{ backgroundImage: 'url(/assets/request-arrow.svg)' }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-surface">
          <div className="flex flex-col gap-1 border-b border-[#E7E4DD] bg-[#F9F8F4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-label-md font-semibold text-[#0F172B]">
                {activeReq ? `Current review - Request ${numberById.get(activeReq.id) ?? 0}` : 'Select a request to review'}
              </h3>
              <p className="mt-0.5 text-caption text-fg-muted">Check the request before sending.</p>
            </div>
          </div>
        {activeReq ? (
          <ReviewDetails entry={activeReq} onPreview={() => onPreview(activeReq.id)} ccEdit={emailEdits[activeReq.id]?.cc} toEdit={emailEdits[activeReq.id]?.to} />
        ) : (
          <div className="flex min-h-72 items-center justify-center p-6 text-body-sm text-fg-muted">
            Select a request to review.
          </div>
        )}
      </section>
    </section>
  );
}

/* ── Stepper indicator ───────────────────────────────────────────── */
const STEP_DEFS = [
  { n: 1, label: 'Build Requests' },
  { n: 2, label: 'Review' },
];

function StepIndicator({ step, onStepClick }: { step: 1 | 2; onStepClick: (n: 1 | 2) => void }) {
  return (
    <div className="flex items-center">
      {STEP_DEFS.map((s, i) => {
        const number = s.n as 1 | 2;
        const active = step === s.n;
        const visited = s.n <= step;
        return (
          <Fragment key={s.n}>
            <button
              type="button"
              onClick={() => onStepClick(number)}
              className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-accent/5"
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                  active || visited ? 'bg-accent text-accent-fg' : 'border border-border bg-bg-muted text-fg-muted',
                )}
              >
                {visited && !active ? <Check size={12} /> : number}
              </span>
              <span className={cn('text-xs font-semibold', active ? 'text-accent' : 'text-fg-muted')}>
                {s.label}
              </span>
            </button>
            {i === 0 && <div className="mx-4 h-px flex-1 bg-border" />}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ProjectRequestFormPage() {
  const router = useRouter();
  const { profile } = useRole();

  const [step,        setStep]        = useState<1 | 2>(1);
  const [reqs,        setReqs]        = useState<ReqEntry[]>([]);
  const [previewId,   setPreviewId]   = useState<number | null>(null);
  const [emailEdits,  setEmailEdits]  = useState<Record<number, EmailEdit>>({});
  const [tokens,      setTokens]      = useState<Record<number, string>>({});
  // Per-field touched state. A field only shows its error once that single field's
  // interaction has ended (a Select/date picker on change, a number input on blur),
  // or the form explicitly requests all errors (Next click / return from Review).
  // Field keys are `${reqId}:programmeCentre`, `${reqId}:deadline`,
  // `${reqId}:level:${idx}:level` etc.; a request's aggregate "touched" state is
  // derived from any of its fields being touched.
  const [touched,     setTouched]     = useState<Record<string, boolean>>({});
  const [buildLayout, setBuildLayout] = useState<BuildLayout>('Layout 1');
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [deleteReqId, setDeleteReqId] = useState<number | null>(null);
  const highlightedReadiness: ReadinessKey | null = null;
  const idRef = useRef(0);

  /* Start with one empty request, open. */
  useEffect(() => {
    const id = idRef.current++;
    setReqs([{ id, department: 'DSTA', programmeCentre: '', pcHead: '', adpnc: '', deadline: '', levels: [emptyLevel()], open: true, intakeYear: DEFAULT_INTAKE_YEAR }]);
  }, []);

  const isDirty = reqs.some(r => r.programmeCentre || r.pcHead || r.adpnc || r.deadline || r.levels.some(l => l.level || l.calendarStart || l.calendarEnd || l.duration));
  const { setDirty, safeNavigate, requestLeave } = useUnsavedChanges();
  useEffect(() => { setDirty(isDirty); }, [isDirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  /* Add a request: collapse all existing, prepend a fresh open one (newest on top). */
  function addRequest() {
    const id = idRef.current++;
    setReqs(prev => [
      { id, department: 'DSTA', programmeCentre: '', pcHead: '', adpnc: '', deadline: '', levels: [emptyLevel()], open: true, intakeYear: DEFAULT_INTAKE_YEAR },
      ...prev.map(r => ({ ...r, open: false })),
    ]);
  }
  function updateReq(id: number, patch: Partial<ReqEntry>) {
    setReqs(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function removeReq(id: number) {
    setReqs(prev => prev.filter(r => r.id !== id));
    setTouched(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${id}:`)) delete next[key];
      }
      return next;
    });
  }
  function touchField(key: string) {
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }));
  }
  /** All field keys for one request entry. */
  function requestFieldKeys(r: ReqEntry): string[] {
    const keys = [`${r.id}:programmeCentre`, `${r.id}:deadline`];
    r.levels.forEach((_, idx) => {
      keys.push(
        `${r.id}:level:${idx}:level`,
        `${r.id}:level:${idx}:calendarStart`,
        `${r.id}:level:${idx}:calendarEnd`,
        `${r.id}:level:${idx}:duration`,
        `${r.id}:level:${idx}:placements`,
      );
    });
    return keys;
  }
  function touchAllRequests() {
    setTouched(prev => {
      const next = { ...prev };
      for (const r of reqs) for (const key of requestFieldKeys(r)) next[key] = true;
      return next;
    });
  }
  /* When a level row is removed, indices shift. Re-index that request's level-field
     touched keys so remaining rows keep their per-field visibility aligned. */
  function handleLevelRemoved(id: number, removedIndex: number) {
    setTouched(prev => {
      const next: Record<string, boolean> = {};
      const prefix = `${id}:level:`;
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(prefix)) { next[key] = value; continue; }
        const rest = key.slice(prefix.length);
        const m = rest.match(/^(\d+):(.+)$/);
        if (!m) { next[key] = value; continue; }
        const idx = parseInt(m[1], 10);
        const field = m[2];
        if (idx < removedIndex) next[key] = value;
        else if (idx > removedIndex) next[`${prefix}${idx - 1}:${field}`] = value;
      }
      return next;
    });
  }
  const isFieldTouched = (key: string) => touched[key] ?? false;
  const isRequestTouched = (id: number) => Object.keys(touched).some(key => key.startsWith(`${id}:`));

  function focusFirstError() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.querySelector('.border-danger');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    });
  }

  function handleReturnToBuild() {
    touchAllRequests();
    setReqs(prev => prev.map(r => reqMissing(r).length > 0 ? { ...r, open: true } : r));
    setStep(1);
    focusFirstError();
  }
  const anyOpen = reqs.some(r => r.open);
  function toggleCollapseAll() {
    setReqs(prev => prev.map(r => ({ ...r, open: !anyOpen })));
  }

  const readyCount = reqs.filter(r => reqMissing(r).length === 0).length;
  const missingReqCount = reqs.filter(r => reqMissing(r).length > 0).length;
  const anyTouchedIncomplete = reqs.some(r => isRequestTouched(r.id) && reqMissing(r).length > 0);
  const activeReq = reqs.find(r => r.open) ?? reqs[0];

  // Number each request by creation order (ids increase as requests are added),
  // so existing requests keep their number and each new one gets the next — the
  // display order stays newest-on-top.
  const numberById = new Map(
    [...reqs].sort((a, b) => a.id - b.id).map((r, i) => [r.id, i + 1]),
  );
  function goToPreview() {
    if (reqs.length === 0) return;
    // Incomplete: touch every request and expand any request with missing fields so
    // the red fields are visible, then stop.
    if (readyCount < reqs.length) {
      touchAllRequests();
      setReqs(prev => prev.map(r => reqMissing(r).length > 0 ? { ...r, open: true } : r));
      focusFirstError();
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const nextTokens: Record<number, string> = {};
    const edits: Record<number, EmailEdit> = {};
    for (const r of reqs) {
      // Every created request gets its OWN upload token, so an additional request to a
      // PC that already has an open one lands as a NEW request/row — never merged into
      // the previous request.
      const token = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      nextTokens[r.id] = token;
      const uploadLink = `${origin}/upload/${token}`;
      const levelList  = Array.from(new Set(r.levels.map(l => l.level).filter(Boolean))).join(', ');
      edits[r.id] = {
        subject: `Project Request – ${levelList}`,
        before:  `Dear ${recipientLabel(r.adpnc)},\n\n`
          + `We are requesting project submissions for the intern categories, calendar periods and durations listed below.\n\n`
          + `What you need to do:\n`
          + `1. Complete the attached Excel template (${TEMPLATE_FILENAME}) with your proposed projects.\n`
          + `2. Ensure every submitted project has obtained the necessary security clearance.\n`
          + `3. Obtain approval from the PC Head for all submitted projects before they are uploaded.\n`
          + `4. Upload the completed projects into the system using the link below.\n\n`
          + `Guide to the columns below:\n`
          + `• Intern Category: the type of intern the project is for.\n`
          + `• Internship Window: the project should be able to run within this period.\n`
          + `• Project Duration: the project should last around this length of time.\n`
          + `• Placements: the number of interns needed for that row.`,
        after:   `Attachment: ${TEMPLATE_FILENAME}. Please fill in your project details in this template.\n\n`
          + `System upload link (to enter the system and upload the completed projects):\n${uploadLink}\n\n`
          + `Please submit by ${formatDate(r.deadline)}.\n\n`
          + `Thank you for your continued support.\n\nWarm regards,\n${profile.name}\nInternship Officer, DSTA`,
        // Editable recipients (DSO/CSIT have no PC Head, so it drops out of Cc).
        to: recipientLabel(r.adpnc),
        cc: [r.pcHead ? recipientLabel(r.pcHead) : '', ...HQ_CC_RECIPIENTS].filter(Boolean).join(', '),
      };
    }
    setTokens(nextTokens);
    setEmailEdits(edits);
    setStep(2);
  }

  function requestLinesForDraft(r: ReqEntry) {
    const filledLines = r.levels.filter(l => l.level || l.calendarStart || l.calendarEnd || l.duration || l.placements !== 1);
    return filledLines.length > 0 ? filledLines : [emptyLevel()];
  }

  function handleSaveDraft() {
    const savedAt = Date.now();
    const draftReqs = reqs.flatMap(r => {
      const headName = recipientLabel(r.pcHead) || recipientLabel(r.adpnc) || 'Draft recipient';
      return requestLinesForDraft(r).map((l, index) => ({
        id: `draft-request-${savedAt}-${r.id}-${index}`,
        pc: r.pcHead || r.adpnc,
        programmeCenter: r.programmeCentre || programmeCenterForPcHead(r.pcHead),
        headName,
        senderName: profile.name,
        internCategory: l.level,
        educationLevel: toEducationLevel(l.level),
        calendarPeriod: calendarPeriodLabel(l),
        periodStart: l.calendarStart || undefined,
        periodEnd: l.calendarEnd || undefined,
        duration: l.duration,
        placements: Math.max(1, l.placements || 1),
        created: 0,
        uploaded: 0,
        sentDate: '',
        deadline: r.deadline,
        status: 'pending' as RequestStatus,
      }));
    });
    saveRequests([...draftReqs, ...loadRequests()]);
    sessionStorage.setItem('dsta_pending_toast', 'Your changes have been saved.');
    sessionStorage.setItem('dsta_pending_toast_title', 'Saved');
    sessionStorage.setItem('dsta_requests_target_tab', 'draft');
    setDirty(false);
    router.push('/requests');
  }

  function handleSend() {
    const today = new Date().toISOString().split('T')[0];
    const existing = loadRequests();
    const newReqs = reqs.flatMap(r => {
      // Fresh token per request (set at preview) → each send is a distinct request row.
      const token = tokens[r.id] ?? `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // DSO/CSIT have no PC Head, so the AD (P&C) is the recipient.
      const headName = recipientLabel(r.pcHead) || recipientLabel(r.adpnc);
      const edit = emailEdits[r.id];   // IO-edited email content from the preview
      return r.levels.map((l, i) => ({
        id:          `req-${Date.now()}-${r.id}-${i}`,
        uploadToken: token,
        pc:          r.pcHead || r.adpnc,
        programmeCenter: r.programmeCentre || programmeCenterForPcHead(r.pcHead),
        headName,
        senderName:  profile.name,
        internCategory: l.level,
        educationLevel: toEducationLevel(l.level),
        calendarPeriod: calendarPeriodLabel(l),
        periodStart: l.calendarStart || undefined,
        periodEnd: l.calendarEnd || undefined,
        duration: l.duration,
        placements:  l.placements,
        created: 0, uploaded: 0, sentDate: today, deadline: r.deadline, status: 'pending' as RequestStatus,
        emailSubject: edit?.subject,
        emailIntro:   edit?.before,
        emailClosing: edit?.after,
        emailTo:      edit?.to,
        emailCc:      edit?.cc,
      }));
    });
    saveRequests([...newReqs, ...existing]);
    reqs.forEach(r => {
      r.levels.forEach(l => {
        addNotification({
          forRole: 'ad-pnc',
          title: `New project request — ${l.level}`,
          body: `${profile.name} has sent a project request for ${l.level} (${l.placements} placement${l.placements !== 1 ? 's' : ''}). Deadline: ${r.deadline ? formatDate(r.deadline) : 'TBD'}.`,
          href: '/submissions', tier: 'action',
        });
      });
    });
    sessionStorage.setItem('dsta_pending_toast', 'The project request has been successfully sent to AD (P&C).');
    sessionStorage.setItem('dsta_pending_toast_title', 'Project request sent');
    setDirty(false);
    router.push('/requests?submitted=1');
  }

  /* Build ProjectRequest-shaped rows from a request entry so the structured Excel
     template can be generated for the email attachment. */
  function templateRequestsForEntry(r: ReqEntry): ProjectRequest[] {
    return r.levels.filter(l => l.level).map((l, i) => ({
      id: `tpl-${r.id}-${i}`,
      pc: r.pcHead || r.adpnc,
      programmeCenter: r.programmeCentre || programmeCenterForPcHead(r.pcHead),
      headName: recipientLabel(r.pcHead) || recipientLabel(r.adpnc),
      senderName: profile.name,
      internCategory: l.level,
      educationLevel: toEducationLevel(l.level),
      calendarPeriod: calendarPeriodLabel(l),
      periodStart: l.calendarStart || undefined,
      periodEnd: l.calendarEnd || undefined,
      duration: l.duration,
      placements: l.placements,
      created: 0, uploaded: 0, sentDate: '', deadline: r.deadline, status: 'pending' as RequestStatus,
    }));
  }

  const previewReq = reqs.find(r => r.id === previewId);
  const previewEdit = previewId !== null ? emailEdits[previewId] : undefined;
  function patchEmail(patch: Partial<EmailEdit>) {
    if (previewId === null) return;
    setEmailEdits(prev => ({ ...prev, [previewId]: { ...prev[previewId], ...patch } }));
  }

  function selectReq(id: number) {
    setReqs(prev => prev.map(r => ({ ...r, open: r.id === id })));
  }

  const layoutControl = (
    <Field>
      <Select value={buildLayout} onValueChange={value => setBuildLayout(value as BuildLayout)}>
        <SelectTrigger className="h-8 text-body-sm">
          <SelectValue className="truncate block" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Layout 1">Layout 1</SelectItem>
          <SelectItem value="Layout 2">Layout 2</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <TooltipProvider>
      <Shell activeRoute="/requests">
      <div className="flex min-h-[calc(100vh-112px)] flex-col">

        {/* Breadcrumb */}
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Breadcrumb className="text-label-md">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/requests"
                  onClick={event => {
                    event.preventDefault();
                    safeNavigate('/requests');
                  }}
                >
                  Project Requests
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Create Project Request</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="w-full sm:w-40 hidden">
            {layoutControl}
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-4 shrink-0 hidden">
          <StepIndicator step={step} onStepClick={setStep} />
        </div>

        {step === 1 && (
          <Alert variant="default" className="mb-6 shrink-0 bg-[#F3EFE5] border-[#E7E4DD]">
            <Info size={16} className="shrink-0 text-fg-muted" />
            <AlertDescription>
              Add or select a request from the left panel. Complete the details on the right.
            </AlertDescription>
          </Alert>
        )}

        {/* ── Step 1: Build the requests ── */}
        {step === 1 && (
          <div className="flex-1 space-y-4">
            {buildLayout === 'Layout 1' ? (
            <div className="flex-1 space-y-4">
              <section className="grid min-h-[560px] min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border bg-surface shadow-lg lg:overflow-visible lg:border-b-0 lg:border-r">
                  <div className="space-y-3 border-b border-border bg-surface px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-label-lg font-semibold text-fg">Requests</h2>
                        <p className="mt-0.5 text-caption text-fg-muted">
                          {reqs.length} request{reqs.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button size="sm" onClick={addRequest}><Plus size={14} />Add Project Request</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1fr)_64px] border-b border-border px-4 py-3 text-caption text-fg-muted bg-[#FDFCFA]">
                    <span>Request</span>
                    <span className="flex items-center justify-end gap-1">
                      Status
                      <FieldHelpTooltip label="Missing">{MISSING_CHECK_HELP}</FieldHelpTooltip>
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col">
                    {reqs.map(r => {
                      const number = numberById.get(r.id) ?? 0;
                      const isActive = activeReq?.id === r.id;
                      const missingCount = reqMissing(r).length;
                      const totalSlots = r.levels.reduce((sum, level) => sum + Math.max(0, level.placements || 0), 0);
                      const hasAnyData = !!(r.programmeCentre || r.deadline || r.levels.some(l => l.level || l.calendarStart || l.calendarEnd || l.duration));
                      const status = missingCount === 0
                        ? 'ready'
                        : !hasAnyData && !isRequestTouched(r.id)
                          ? 'not-started'
                          : 'incomplete';
                      const StatusIcon = status === 'ready' ? Check : status === 'incomplete' ? AlertCircle : Info;
                      const statusLabel = status === 'ready' ? 'Ready' : status === 'incomplete' ? 'Incomplete' : 'Not Started';
                      const touchedAndMissing = isRequestTouched(r.id) && missingCount > 0;
                      return (
                        <div
                          key={r.id}
                          className={cn(
                            'group relative box-border w-full min-w-0 border-b px-4 py-3 transition-colors',
                            isActive && touchedAndMissing
                              ? 'z-10 border-y border-[#F8A4A8] bg-white'
                              : isActive
                                ? 'z-10 border-y border-[#E7E4DD] bg-[#F4F2EC]'
                                : 'border-border bg-surface hover:bg-bg-muted',
                          )}
                          style={
                            isActive && touchedAndMissing
                              ? { backgroundImage: 'linear-gradient(rgba(251,44,54,0.1), rgba(251,44,54,0.1))' }
                              : undefined
                          }
                        >
                          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-3">
	                            <button
	                              type="button"
	                              onClick={() => selectReq(r.id)}
	                              className={cn('min-w-0 text-left', isActive && 'pr-3')}
	                            >
                              <span className={cn('block truncate text-sm font-medium', touchedAndMissing ? 'text-danger' : 'text-fg')}>
                                Request {number} - {r.programmeCentre || 'Start editing'}
                              </span>
                              <span className={cn('mt-1 block truncate text-xs font-normal', touchedAndMissing ? 'text-danger' : 'text-fg-muted')}>
                                {r.levels.filter(l => l.level).length || 0} intern categor{r.levels.filter(l => l.level).length === 1 ? 'y' : 'ies'} · {totalSlots} placement{totalSlots === 1 ? '' : 's'}
                              </span>
                            </button>
                            <div className="flex items-center justify-end gap-1">
                              <div className="flex min-w-5 justify-end">
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <button
                                        type="button"
                                        aria-label={statusLabel}
                                        className={cn(
                                          'inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-accent/40',
                                          status === 'incomplete' && 'text-danger hover:text-danger/80',
                                          status === 'ready' && 'text-success',
                                          status === 'not-started' && 'text-fg-subtle opacity-0 group-hover:opacity-100',
                                        )}
                                      >
                                        <StatusIcon size={15} />
                                      </button>
                                    }
                                  />
                                  <TooltipContent side="top" align="center">
                                    {status === 'not-started'
                                      ? statusLabel
                                      : `${missingCount} missing field input${missingCount !== 1 ? 's' : ''}`}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="flex h-7 w-7 items-center justify-center hidden">
                                {reqs.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteReqId(r.id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-fg-muted opacity-0 transition-colors hover:bg-danger-bg hover:text-danger focus:opacity-100 group-hover:opacity-100"
                                    aria-label={`Remove request ${number}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <span
                              className="absolute right-[-11px] top-1/2 z-10 h-full w-[11px] -translate-y-1/2 bg-[length:auto_100%] bg-right bg-no-repeat"
                              style={{
                                backgroundImage: `url(${touchedAndMissing ? '/assets/request-error-arrow.svg' : '/assets/request-arrow.svg'})`,
                              }}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                <section className="flex min-h-0 min-w-0 flex-col bg-surface">
                  <div className="flex flex-col gap-3 border-b border-[#E7E4DD] bg-[#F9F8F4] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full flex items-center justify-between gap-3">
                      <h3 className="text-label-md font-semibold text-[#0F172B]">
                        {activeReq ? `Current Editing - Request ${numberById.get(activeReq.id) ?? 0}` : 'Add a request to begin'}
                      </h3>
                      {activeReq && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={reqs.length <= 1}
                          onClick={() => setDeleteReqId(activeReq.id)}
                        >
                          <Trash2 size={14} />Delete
                        </Button>
                      )}
                    </div>
                  </div>
                  {activeReq ? (
                    <RequestCard
                      key={activeReq.id}
                      entry={activeReq}
                      number={numberById.get(activeReq.id) ?? 0}
                      onChange={patch => updateReq(activeReq.id, patch)}
                      onRemove={() => setDeleteReqId(activeReq.id)}
                      guided
                      highlightedSection={highlightedReadiness}
                      ccEdit={emailEdits[activeReq.id]?.cc}
                      toEdit={emailEdits[activeReq.id]?.to}
                      isFieldTouched={isFieldTouched}
                      touchField={touchField}
                      onLevelRemoved={removedIndex => handleLevelRemoved(activeReq.id, removedIndex)}
                    />
                  ) : (
                    <div className="flex min-h-72 items-center justify-center p-6 text-body-sm text-fg-muted">
                      Add a request to begin.
                    </div>
                  )}
                </section>
              </section>

              {anyTouchedIncomplete && (
                <div className="flex items-center gap-2 rounded-lg bg-danger-bg px-4 py-2.5">
                  <AlertCircle size={14} className="shrink-0 text-danger" />
                  <p className="text-body-sm text-danger">Some mandatory fields are missing. Please complete the fields highlighted in red.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid flex-1 items-start gap-4">
              <div className="min-w-0 w-full">
                <section className="rounded-xl border border-border bg-surface shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 xl:flex-row xl:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-label-lg font-semibold text-fg">Requests</h2>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={toggleCollapseAll} aria-label={anyOpen ? 'Collapse all' : 'Expand all'}>
                        <ChevronsDownUp size={15} />{anyOpen ? 'Collapse all' : 'Expand all'}
                      </Button>
                      <Button size="sm" onClick={addRequest}><Plus size={15} />Add Request</Button>
                    </div>
                  </div>

                  {reqs.map(r => (
                    <RequestCard
                      key={r.id}
                      entry={r}
                      number={numberById.get(r.id) ?? 0}
                      onChange={patch => updateReq(r.id, patch)}
                      onRemove={() => setDeleteReqId(r.id)}
                      canRemove={reqs.length > 1}
                      highlightedSection={highlightedReadiness}
                      ccEdit={emailEdits[r.id]?.cc}
                      toEdit={emailEdits[r.id]?.to}
                      isFieldTouched={isFieldTouched}
                      touchField={touchField}
                      onLevelRemoved={removedIndex => handleLevelRemoved(r.id, removedIndex)}
                    />
                  ))}
                </section>

                {anyTouchedIncomplete && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger-bg px-4 py-2.5">
                    <AlertCircle size={14} className="shrink-0 text-danger" />
                    <p className="text-body-sm text-danger">Some mandatory fields are missing. Please complete the fields highlighted in red.</p>
                  </div>
                )}
              </div>
            </div>
          )
            }
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <div className="flex-1">
            <Alert variant="default" className="mb-4 bg-[#F3EFE5] border-[#E7E4DD]">
              <Clock className="text-fg-muted" />
              <AlertDescription>
                Automatic reminders will be sent {AUTO_REMINDER_DAYS.join(' and ')} days before the deadline.
              </AlertDescription>
            </Alert>
            {buildLayout === 'Layout 1' ? (
              <ReviewListLayout
                reqs={reqs}
                activeReq={activeReq}
                numberById={numberById}
                onSelect={selectReq}
                onPreview={setPreviewId}
                emailEdits={emailEdits}
              />
            ) : (
              <section className="rounded-xl border border-border bg-surface shadow-sm">
                <div className="border-b border-border px-5 py-3.5">
                  <h2 className="text-label-lg font-semibold text-fg">Review {reqs.length} request{reqs.length !== 1 ? 's' : ''}</h2>
                  <p className="mt-0.5 text-body-sm text-fg-muted">Check each request before sending. Use “Preview email” to see the message a recipient will receive.</p>
                </div>
                {reqs.map(r => (
                  <ReviewCard key={r.id} entry={r} number={numberById.get(r.id) ?? 0} onPreview={() => setPreviewId(r.id)} ccEdit={emailEdits[r.id]?.cc} toEdit={emailEdits[r.id]?.to} />
                ))}
              </section>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-2">
          {step > 1 && (
            <Button variant="ghost" size="md" onClick={handleReturnToBuild}>
              Back
            </Button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {step === 1 ? (
              <>
                <Button variant="outline" size="md" onClick={() => requestLeave('/requests')}>Cancel</Button>
                <Button variant="outline" size="md" onClick={handleSaveDraft}>Save as Draft</Button>
                <Button size="md" onClick={goToPreview}>Next</Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="md" onClick={() => requestLeave('/requests')}>Cancel</Button>
                <Button variant="outline" size="md" onClick={handleSaveDraft}>Save as Draft</Button>
                <Button size="md" onClick={() => setConfirmSendOpen(true)}>Confirm Send</Button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Email preview sheet */}
      <Sheet
        open={!!previewReq}
        onOpenChange={open => {
          if (!open) setPreviewId(null);
        }}
      >
        <SheetContent side="right" className="w-[min(100vw,680px)] sm:max-w-none">
          <SheetHeader>
            <SheetTitle>Email preview</SheetTitle>
            {previewReq && <SheetDescription>To {previewEdit?.to || recipientLabel(previewReq.adpnc)}</SheetDescription>}
          </SheetHeader>
          <SheetBody className="space-y-4">
        {previewReq && previewEdit && (
          <>
          <p className="text-body-sm text-fg-muted">The recipients, subject and message below are editable. Click into a field to customise the email before sending. The placement requirements table is generated automatically.</p>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="space-y-3">
              <label className="flex items-start gap-3 border-b border-border pb-3">
                <span className="w-16 shrink-0 pt-2 text-body-sm font-medium text-fg-muted">To</span>
                <Combobox
                  selected={parseCcList(previewEdit.to)}
                  onToggle={(val: string) => {
                    const current = new Set(parseCcList(previewEdit.to));
                    if (current.has(val)) current.delete(val); else current.add(val);
                    patchEmail({ to: Array.from(current).join(', ') });
                  }}
                  options={[
                    recipientLabel(previewReq.adpnc),
                    recipientLabel(previewReq.pcHead),
                  ].filter(Boolean)}
                  placeholder="Select recipients"
                  chips="inline-text"
                  hideSearch
                  className="flex-1"
                />
              </label>
              <label className="flex items-start gap-3 border-b border-border pb-3">
                <span className="w-16 shrink-0 pt-2 text-body-sm font-medium text-fg-muted">Cc</span>
                <Combobox
                  selected={parseCcList(previewEdit.cc)}
                  onToggle={(val: string) => {
                    const current = new Set(parseCcList(previewEdit.cc));
                    if (current.has(val)) current.delete(val); else current.add(val);
                    patchEmail({ cc: Array.from(current).join(', ') });
                  }}
                  options={[
                    recipientLabel(previewReq.pcHead),
                    ...HQ_CC_RECIPIENTS,
                  ].filter(Boolean)}
                  placeholder="Select recipients"
                  chips="inline-text"
                  hideSearch
                  className="flex-1"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Subject</span>
                <input
                  value={previewEdit.subject}
                  onChange={e => patchEmail({ subject: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-1 text-body-sm font-medium text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
                />
              </label>
              {/* Excel template attachment */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Paperclip size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-fg">{TEMPLATE_FILENAME}</p>
                  <p className="text-caption text-fg-muted">Project-submission template — pre-structured with the requested intern categories &amp; calendar periods.</p>
                </div>
                <Button variant="outline" size="sm" disabled onClick={() => downloadRequestTemplateFromXlsx(templateRequestsForEntry(previewReq), TEMPLATE_FILENAME)}>
                  <Download size={14} />Download
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <label className="block">
                <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Opening message</span>
              <textarea
                value={previewEdit.before}
                onChange={e => patchEmail({ before: e.target.value })}
                rows={Math.max(2, previewEdit.before.split('\n').length)}
                  className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 font-sans text-body-sm leading-6 text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
              />
              </label>
              <div className="rounded-lg border border-border bg-bg-subtle p-4">
                <PlacementsTable
                  intakeYear={previewReq.intakeYear}
                  rows={previewReq.levels.map(l => ({
                    label: l.level,
                    calendarPeriod: calendarPeriodLabel(l),
                    duration: l.duration,
                    placements: l.placements,
                  }))}
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-body-sm font-medium text-fg-muted">Closing message</span>
              <textarea
                value={previewEdit.after}
                onChange={e => patchEmail({ after: e.target.value })}
                rows={Math.max(2, previewEdit.after.split('\n').length)}
                  className="block w-full resize-none rounded-md border border-border bg-surface px-3 py-2 font-sans text-body-sm leading-6 text-fg shadow-sm outline-none transition-colors hover:border-border-strong hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent"
              />
              </label>
          </div>
          </>
        )}
          </SheetBody>
          <SheetFooter>
            <Button variant="primary" size="md" onClick={() => setPreviewId(null)}>Save Email Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send project request?</DialogTitle>
            <DialogDescription>
              Your project request will be sent to the Programme Centre for intern placements.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSendOpen(false)}>
              Stay on page
            </Button>
            <Button onClick={() => { setConfirmSendOpen(false); handleSend(); }}>
              <Send size={14} />Confirm Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteReqId !== null} onOpenChange={open => { if (!open) setDeleteReqId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Request?</DialogTitle>
            <DialogDescription>
              Deleting request will permanently remove all entered information and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReqId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => { if (deleteReqId !== null) removeReq(deleteReqId); setDeleteReqId(null); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
    </TooltipProvider>
  );
}
