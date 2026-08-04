'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { Badge, StatusBadge, AppStatusBadge, CategoryBadge } from '@/components/ui-legacy/badge';
import Button from '@/components/ui-legacy/button';
import { Card } from '@/components/ui/card';
import Drawer from '@/components/ui-legacy/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmptyState from '@/components/ui-legacy/empty-state';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Pencil, Trash2, ChevronRight, CheckCircle2, PlayCircle, Layers,
  FileText, Upload, CalendarDays, ChevronDown, CheckSquare, CircleDot,
  AlertCircle, CheckCircle, Users, ArrowRight, ArrowLeft,
} from 'lucide-react';
import Modal from '@/components/ui-legacy/modal';
import SortTh from '@/components/ui-legacy/sort-th';
import { loadProgrammes, saveProgrammes, loadProjects, loadAttachments } from '@/lib/storage';
import ProgToggle from '@/components/ui-legacy/prog-toggle';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { internCategoriesForLevel } from '@/lib/data';
import { RuleReadRow, ReqReadView } from '@/components/ui-legacy/eligibility-read';
import { PROGRAMMES_CHANGED_EVENT } from '@/lib/programme-context';
import { programmeIntakes, currentIntakeId } from '@/lib/intakes';
import { cn, formatDate, deriveAppStatus, ruleToNatural } from '@/lib/utils';
import type { Programme, CriteriaGroup, CriteriaRule, ProjectEntry, ProjectAttachment, AppFormTemplate, FormField } from '@/lib/types';
import appFormSeed from '@/data/app-form-templates.json';

/* Application form helpers */
const AFT_KEY = 'dsta_app_form_templates';

/* Per-intake application stats */
type AppStat = { total: number; newCount: number };

/* Apps tagged with an `intakeId` count against that intake; untagged (legacy/seed)
   apps bucket by programme and are attributed to the programme's first intake. */
function loadAppIntakeStats(category?: string | null): { byIntake: Record<string, AppStat>; untagged: Record<string, AppStat> } {
  try {
    const raw = localStorage.getItem('dsta_applications');
    if (!raw) return { byIntake: {}, untagged: {} };
    const all: { programmeId: string; intakeId?: string; status: string; internCategory?: string }[] = JSON.parse(raw);
    const apps = category ? all.filter(a => a.internCategory === category) : all;
    const byIntake: Record<string, AppStat> = {};
    const untagged: Record<string, AppStat> = {};
    for (const a of apps) {
      const isNew = a.status === 'Pending Screening' || a.status === 'Pending Review';
      const bucket = a.intakeId ? (byIntake[a.intakeId] ??= { total: 0, newCount: 0 })
                                : (untagged[a.programmeId] ??= { total: 0, newCount: 0 });
      bucket.total++;
      if (isNew) bucket.newCount++;
    }
    return { byIntake, untagged };
  } catch { return { byIntake: {}, untagged: {} }; }
}

const fmtMonth = (d: string) => {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
};
/** Short intake label for the switcher, e.g. "Jan - Jun 2027". */
function intakeLabel(i: { start: string; end: string }): string {
  if (!i.start || !i.end) return 'Intake';
  return `${fmtMonth(i.start)} - ${fmtMonth(i.end)}`;
}

function loadTemplate(name: string): AppFormTemplate | null {
  try {
    const raw = localStorage.getItem(AFT_KEY);
    const all: AppFormTemplate[] = raw ? JSON.parse(raw) : (appFormSeed as AppFormTemplate[]);
    return all.find(t => t.id === name || t.name === name) ?? null;
  } catch { return null; }
}

type SectionEntry = { name: string; fields: FormField[] };

function groupBySection(fields: FormField[]): SectionEntry[] {
  const map = new Map<string, FormField[]>();
  for (const f of fields) {
    if (!map.has(f.section)) map.set(f.section, []);
    map.get(f.section)!.push(f);
  }
  return Array.from(map.entries()).map(([name, flds]) => ({ name, fields: flds }));
}

/* Application Form Drawer */
function ApplicationFormDrawer({
  template, open, onClose,
}: { template: AppFormTemplate; open: boolean; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const visibleFields = (template.fields ?? []).filter(f => !f.hidden);
  const sections = groupBySection(visibleFields);

  function set(id: string, val: string | string[]) {
    setValues(prev => ({ ...prev, [id]: val }));
    if (errors[id]) setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function toggleCheckbox(id: string, opt: string) {
    const prev = (values[id] as string[] | undefined) ?? [];
    const next = prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt];
    set(id, next);
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    for (const f of visibleFields) {
      if (!f.required) continue;
      const v = values[f.id];
      if (f.type === 'checkbox') {
        if (!v || (v as string[]).length === 0) newErrors[f.id] = 'Required';
      } else {
        if (!v || (v as string).trim() === '') newErrors[f.id] = 'Required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSubmitted(true);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleClose() {
    setSubmitted(false);
    setValues({});
    setErrors({});
    onClose();
  }

  if (submitted) {
    return (
      <Drawer open={open} onClose={handleClose} title="Application Form" subtitle={template.name} width="680px">
        <div ref={topRef} className="flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center">
            <CheckCircle size={32} className="text-success" />
          </div>
          <div>
            <h3 className="text-headline-md text-fg mb-2">Application Submitted</h3>
            <p className="text-body-md text-fg-muted max-w-xs">Your application has been received. You will be notified of your application status via email.</p>
          </div>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title="Application Form"
      subtitle={template.name}
      width="680px"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-caption text-fg-muted"><span className="text-danger">*</span> Required fields</p>
          <div className="flex gap-3">
            <Button onClick={handleSubmit}>Submit Application</Button>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      }
    >
      <div ref={topRef} className="space-y-8 pb-2">
        {sections.map(section => (
          <div key={section.name}>
            <h3 className="text-label-md font-bold text-fg uppercase tracking-wider border-b border-border pb-2 mb-4">
              {section.name}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {section.fields.map((field, fi) => {
                const isFullWidth = field.fullWidth || field.type === 'checkbox' || field.type === 'upload';
                const isLastAlone = !isFullWidth && fi === section.fields.length - 1;
                const spanFull = isFullWidth || isLastAlone;
                return (
                  <AppFormField
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    onChange={val => set(field.id, val)}
                    onToggleCheckbox={opt => toggleCheckbox(field.id, opt)}
                    error={errors[field.id]}
                    className={spanFull ? 'col-span-2' : ''}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

/* Individual field renderer */
function AppFormField({
  field, value, onChange, onToggleCheckbox, error, className,
}: {
  field: FormField;
  value?: string | string[];
  onChange: (val: string) => void;
  onToggleCheckbox: (opt: string) => void;
  error?: string;
  className?: string;
}) {
  const strVal = (value as string | undefined) ?? '';
  const arrVal = (value as string[] | undefined) ?? [];

  const labelEl = (
    <label className="block text-label-sm font-semibold text-fg mb-1.5">
      {field.label}
      {field.required && <span className="text-danger">*</span>}
      {field.myInfo && (
        <span className="ml-2 text-[12px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-sm">MyInfo</span>
      )}
      {field.remarks && (
        <span className="ml-2 text-caption text-fg-muted font-normal">{field.remarks}</span>
      )}
    </label>
  );

  const errEl = error ? (
    <p className="flex items-center gap-1 mt-1 text-caption text-danger">
      <AlertCircle size={11} /> {error}
    </p>
  ) : null;

  const inputBase = cn(
    'w-full px-3 py-2 rounded-lg border text-body-md text-fg bg-surface transition-colors outline-none',
    'focus:ring-2 focus:ring-accent/30 focus:border-accent',
    error ? 'border-danger' : 'border-border hover:border-border-strong',
  );

  if (field.type === 'textbox') {
    const isLong = field.maxChars && field.maxChars > 100;
    return (
      <div className={className}>
        {labelEl}
        {isLong ? (
          <textarea
            value={strVal}
            onChange={e => onChange(e.target.value)}
            maxLength={field.maxChars}
            rows={4}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={cn(inputBase, 'resize-none')}
          />
        ) : (
          <input
            type="text"
            value={strVal}
            onChange={e => onChange(e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            className={inputBase}
          />
        )}
        {field.maxChars && <p className="text-caption text-fg-subtle mt-1 text-right">{strVal.length}/{field.maxChars}</p>}
        {errEl}
      </div>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <div className={className}>
        {labelEl}
        <div className="relative">
          <select
            value={strVal}
            onChange={e => onChange(e.target.value)}
            className={cn(inputBase, 'appearance-none pr-8 cursor-pointer')}
          >
            <option value="">Select</option>
            {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
        </div>
        {errEl}
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className={className}>
        {labelEl}
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
                strVal === opt ? 'border-accent bg-accent' : 'border-border group-hover:border-accent/60',
              )}>
                {strVal === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <input type="radio" className="sr-only" checked={strVal === opt} onChange={() => onChange(opt)} />
              <span className="text-body-md text-fg">{opt}</span>
            </label>
          ))}
        </div>
        {errEl}
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className={className}>
        {labelEl}
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer group">
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                arrVal.includes(opt) ? 'border-accent bg-accent' : 'border-border group-hover:border-accent/60',
              )}>
                {arrVal.includes(opt) && <CheckSquare size={10} className="text-white" strokeWidth={3} />}
              </div>
              <input type="checkbox" className="sr-only" checked={arrVal.includes(opt)} onChange={() => onToggleCheckbox(opt)} />
              <span className="text-body-md text-fg">{opt}</span>
            </label>
          ))}
        </div>
        {errEl}
      </div>
    );
  }

  if (field.type === 'calendar') {
    return (
      <div className={className}>
        {labelEl}
        <div className="relative">
          <input
            type="date"
            value={strVal}
            onChange={e => onChange(e.target.value)}
            className={cn(inputBase, 'pr-10')}
          />
          <CalendarDays size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
        </div>
        {errEl}
      </div>
    );
  }

  if (field.type === 'upload') {
    return (
      <div className={className}>
        {labelEl}
        <label className={cn(
          'flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
          error ? 'border-danger' : 'border-border hover:border-accent/50 hover:bg-accent/3',
        )}>
          <Upload size={20} className="text-fg-muted" />
          <div className="text-center">
            <p className="text-body-sm font-semibold text-accent">Click to upload</p>
            <p className="text-caption text-fg-subtle">PNG, JPG, PDF up to 5 MB</p>
          </div>
          <input type="file" className="sr-only" onChange={e => {
            const file = e.target.files?.[0];
            if (file) onChange(file.name);
          }} />
          {strVal && <p className="text-caption text-fg-muted mt-1">{strVal}</p>}
        </label>
        {errEl}
      </div>
    );
  }

  return null;
}

/* Read-only application form preview */
function ApplicationFormPreviewModal({
  template,
  onClose,
}: {
  template: AppFormTemplate;
  onClose: () => void;
}) {
  const visibleFields = (template.fields ?? []).filter(field => !field.hidden);
  const sections = groupBySection(visibleFields);

  function FieldRow({ field }: { field: FormField }) {
    return (
      <div className="flex gap-4 items-start py-2 border-b border-border last:border-0">
        <span className="text-body-sm text-fg-muted min-w-[210px] leading-5 pt-px">
          {field.label}{field.required && <span className="text-danger ml-0.5">*</span>}
        </span>
        {field.type === 'textbox' && field.maxChars && field.maxChars > 100 ? (
          <div className="flex-1 flex flex-col gap-2.5 pt-1.5">
            <div className="border-b border-border-strong" />
            <div className="border-b border-border-strong" />
            <div className="border-b border-border-strong" />
          </div>
        ) : field.type === 'dropdown' && field.options?.length ? (
          <div className="flex-1 flex flex-wrap gap-x-5 gap-y-1.5 pt-px">
            {field.options.map(opt => (
              <span key={opt} className="flex items-center gap-1.5 text-caption text-fg-muted">
                <span className="w-3.5 h-3.5 border border-border-strong rounded-sm inline-block flex-shrink-0" />
                {opt}
              </span>
            ))}
          </div>
        ) : field.type === 'radio' && field.options?.length ? (
          <div className="flex-1 flex flex-wrap gap-x-5 gap-y-1.5 pt-px">
            {field.options.map(opt => (
              <span key={opt} className="flex items-center gap-1.5 text-caption text-fg-muted">
                <span className="w-3.5 h-3.5 rounded-full border border-border-strong inline-block flex-shrink-0" />
                {opt}
              </span>
            ))}
          </div>
        ) : field.type === 'checkbox' && field.options?.length ? (
          <div className="flex-1 flex flex-wrap gap-x-5 gap-y-1.5 pt-px">
            {field.options.map(opt => (
              <span key={opt} className="flex items-center gap-1.5 text-caption text-fg-muted">
                <span className="w-3.5 h-3.5 border border-border-strong rounded-sm inline-block flex-shrink-0" />
                {opt}
              </span>
            ))}
          </div>
        ) : field.type === 'calendar' ? (
          <div className="flex-1 border-b border-border-strong text-caption text-fg-subtle pb-0.5">DD / MM / YYYY</div>
        ) : field.type === 'upload' ? (
          <div className="flex-1 border border-dashed border-border-strong rounded-md px-3 py-1.5 text-caption text-fg-subtle">Attach file</div>
        ) : (
          <div className="flex-1 border-b border-border-strong mt-3" />
        )}
      </div>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden border border-border p-0 shadow-xl">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle className="text-headline-md text-fg">Form Preview</DialogTitle>
          <DialogDescription className="truncate text-body-sm">{template.name}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-bg-muted p-6">
          {sections.length === 0 ? (
            <p className="text-body-sm text-fg-muted italic p-4">No preview available for this template.</p>
          ) : (
            <div className="bg-surface shadow-md mx-auto max-w-[720px] px-14 py-12">
              <div className="flex items-center gap-4 pb-5 mb-6 border-b-2 border-accent">
                <img src="/images/dsta-logo.svg" alt="DSTA" className="h-12 w-auto object-contain shrink-0" />
                <div>
                  <p className="text-caption uppercase tracking-widest text-accent font-semibold leading-tight">Defence Science and Technology Agency</p>
                  <p className="text-caption text-fg-muted">Singapore</p>
                </div>
              </div>
              <h1 className="text-headline-sm text-accent text-center mb-1">{template.name}</h1>
              <p className="text-caption text-fg-subtle text-center mb-8 uppercase tracking-widest">For Official Use Only</p>

              {sections.map(section => (
                <div key={section.name} className="mb-7">
                  <div className="bg-accent px-4 py-2 mb-3">
                    <p className="text-caption text-accent-fg font-semibold uppercase tracking-widest">{section.name}</p>
                  </div>
                  <div>
                    {section.fields.map(field => <FieldRow key={field.id} field={field} />)}
                  </div>
                </div>
              ))}

              <div className="mt-10 pt-4 border-t border-border">
                <p className="text-caption text-fg-subtle text-center">DSTA Talent Acquisition Portal - {template.name}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Eligibility read-view */
/* Eligibility compact summary + collapsible detail */
function criteriaCountFor(groups: CriteriaGroup[]): number {
  return groups.reduce(
    (total, group) => total + group.rules.length + (group.pathways ?? []).reduce((n, pathway) => n + pathway.rules.length, 0),
    0,
  );
}

function pathwayCountFor(groups: CriteriaGroup[]): number {
  return groups.reduce((total, group) => total + (group.pathways ?? []).length, 0);
}

function compactRuleText(rule: CriteriaRule): string {
  const sentence = ruleToNatural(rule);
  if (sentence) return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  const value = Array.isArray(rule.value) ? rule.value.join(', ') : rule.value;
  return `${rule.type}: ${value}`;
}

function eligibilityHighlights(groups: CriteriaGroup[]): { text: string; weight: number }[] {
  const items: { text: string; weight: number }[] = [];
  for (const group of groups) {
    if (group.matchType === 'ANY') {
      const pathways = group.pathways ?? [];
      const ruleCount = pathways.reduce((total, pathway) => total + pathway.rules.length, 0);
      if (pathways.length > 0) {
        items.push({ text: `Meet one of ${pathways.length} accepted academic pathways`, weight: ruleCount });
      }
      continue;
    }
    for (const rule of group.rules) {
      items.push({ text: compactRuleText(rule), weight: 1 });
    }
  }
  return items.filter(item => item.text).slice(0, 3);
}

function EligibilitySection({ groups, className }: { groups: CriteriaGroup[]; className?: string }) {
  const criteriaCount = criteriaCountFor(groups);
  const pathwayCount = pathwayCountFor(groups);
  const highlights = eligibilityHighlights(groups);
  const visibleWeight = highlights.reduce((total, item) => total + item.weight, 0);
  const hiddenCriteriaCount = Math.max(criteriaCount - visibleWeight, 0);
  const [showDetail, setShowDetail] = useState(false);
  const isEmpty        = !groups || groups.length === 0;

  return (
    <Card className={cn('p-6', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-headline-md text-fg">Eligibility Requirements</h2>
        {!isEmpty && (
          <span className="rounded-md border border-border bg-bg-subtle px-2 py-1 text-caption font-medium text-fg-muted">
            {criteriaCount} criteria
          </span>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={CheckCircle}
          title="No requirements set"
          description="All applicants are eligible for this programme."
          size="sm"
        />
      ) : (
        <>
          {/* Compact PRIZM detail summary; full rule list stays behind disclosure. */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-caption text-fg-muted">Rule groups</p>
              <p className="mt-1 text-body-sm font-medium text-fg">{groups.length}</p>
            </div>
            <div>
              <p className="text-caption text-fg-muted">Criteria</p>
              <p className="mt-1 text-body-sm font-medium text-fg">{criteriaCount}</p>
            </div>
            <div>
              <p className="text-caption text-fg-muted">Pathways</p>
              <p className="mt-1 text-body-sm font-medium text-fg">{pathwayCount || 'None'}</p>
            </div>
          </div>


          <div className="mb-4 max-w-[78ch] space-y-2">
            {highlights.map(item => (
              <div key={item.text} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-accent" />
                <p className="text-body-sm leading-relaxed text-fg">{item.text}</p>
              </div>
            ))}
            {hiddenCriteriaCount > 0 && (
              <p className="text-caption text-fg-muted">+{hiddenCriteriaCount} more criteria in detail</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowDetail(v => !v)}
            aria-expanded={showDetail}
            className="flex items-center gap-1.5 text-body-sm font-semibold text-accent hover:underline"
          >
            <ChevronRight size={13} className={cn('transition-transform', showDetail && 'rotate-90')} />
            {showDetail ? 'Hide criteria detail' : 'View criteria detail'}
          </button>
          {showDetail && (
            <div className="mt-4 pt-4 border-t border-border">
              <ReqReadView groups={groups} />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function DetailMetric({ value, label }: { value: number | string; label: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-headline-md text-fg">{value}</p>
      <p className="mt-1 text-caption text-fg-muted">{label}</p>
    </Card>
  );
}

type AssignedProjectSortCol = 'title' | 'mentor' | 'placements' | 'scope' | 'status';
type AssignedProjectRow = {
  project: ProjectEntry;
  placements: number;
  scopeLabel: 'Shared project' | 'Single intake';
  statusLabel: 'Filled' | 'Partially Filled' | 'Open';
};

function assignedProjectStatusLabel(status: ProjectEntry['status']): AssignedProjectRow['statusLabel'] {
  if (status === 'confirmed') return 'Filled';
  if (status === 'in-progress') return 'Partially Filled';
  return 'Open';
}

/* Main page */
export default function ProgrammeDetailPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [prog,          setProg]          = useState<Programme | null>(null);
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [statusOpen,    setStatusOpen]    = useState(false);
  const [projects,      setProjects]      = useState<ProjectEntry[]>([]);
  const [attachments,   setAttachments]   = useState<ProjectAttachment[]>([]);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formTemplate,   setFormTemplate]   = useState<AppFormTemplate | null>(null);
  const [appStats,      setAppStats]      = useState<{ byIntake: Record<string, AppStat>; untagged: Record<string, AppStat> }>({ byIntake: {}, untagged: {} });
  const [selIntakeId,   setSelIntakeId]   = useState<string>('');
  const [assignedSortCol, setAssignedSortCol] = useState<AssignedProjectSortCol | null>(null);
  const [assignedSortDir, setAssignedSortDir] = useState<1 | -1>(1);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedScopeFilter, setAssignedScopeFilter] = useState<'all' | AssignedProjectRow['scopeLabel']>('all');
  const [assignedStatusFilter, setAssignedStatusFilter] = useState<'all' | AssignedProjectRow['statusLabel']>('all');
  const [activeCat, setActiveCat] = useState('');

  useEffect(() => {
    try {
      const s = localStorage.getItem('dsta_programme_view');
      if (!s) return;
      const p: Programme = JSON.parse(s);
      const allProjects = loadProjects();
      const programmeAttachments = loadAttachments().filter(a => a.programmeId === p.id);
      const attachedProjectIds = new Set(programmeAttachments.map(a => a.projectId));
      setProg(p);
      setProjects(allProjects.filter(pr => pr.programme === p.id || attachedProjectIds.has(pr.id)));
      setAttachments(programmeAttachments);
      setSelIntakeId(currentIntakeId(p));
      if (p.formTemplate) setFormTemplate(loadTemplate(p.formTemplate));

      const pendingToast = sessionStorage.getItem('dsta_pending_toast');
      if (pendingToast) {
        sessionStorage.removeItem('dsta_pending_toast');
        showToast(pendingToast);
      }
    } catch {}
  }, []);

  /* Intern-category context — an IO manages the programme by intern category. */
  const catList = prog ? internCategoriesForLevel(prog.educationLevel as string) : [];
  const selectedCat = activeCat || catList[0] || '';
  useEffect(() => {
    setAppStats(loadAppIntakeStats(selectedCat || null));
  }, [selectedCat]);

  function advanceStatus(next: 'Active' | 'Completed') {
    if (!prog) return;
    const updated = { ...prog, status: next };
    try {
      const all = loadProgrammes();
      saveProgrammes(all.map(p => p.id === prog.id ? updated : p));
      window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));
    } catch {}
    setProg(updated);
    setStatusOpen(false);
  }

  function handleEdit() {
    if (!prog) return;
    localStorage.setItem('dsta_edit_pending', prog.id);
    router.push('/programmes/edit');
  }

  function confirmDelete() {
    if (!prog) return;
    try {
      const all = loadProgrammes();
      saveProgrammes(all.filter(p => p.id !== prog.id));
      window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));
    } catch {}
    router.push('/programmes');
  }

  if (!prog) {
    return (
      <Shell activeRoute="/programmes">
        <div className="flex items-center justify-center py-32">
          <p className="text-body-lg text-fg-muted">No programme data found.</p>
        </div>
      </Shell>
    );
  }

/* Intake context */
  const intakes      = programmeIntakes(prog);
  const selIntake    = intakes.find(i => i.id === selIntakeId) ?? intakes[0];
  const selIdx       = Math.max(0, intakes.findIndex(i => i.id === selIntake.id));
  const isFirstIntake = selIdx === 0;
  const intakeAppStatus = selIntake.appOpen && selIntake.appClose ? deriveAppStatus(selIntake.appOpen, selIntake.appClose) : null;

  /* Projects + applications scoped to the selected intake (untagged legacy records
     fall to the first intake). */
  const projectById = new Map(projects.map(project => [project.id, project]));
  const hasAttachmentRows = attachments.length > 0;
  const intakeProjectRows = hasAttachmentRows
    ? attachments
        .filter(attachment => attachment.intakeId === selIntake.id)
        .map(attachment => {
          const project = projectById.get(attachment.projectId);
          return project ? { project, placements: project.slots } : null;
        })
        .filter(Boolean) as { project: ProjectEntry; placements: number }[]
    : projects
        .filter(project => project.intakeId ? project.intakeId === selIntake.id : isFirstIntake)
        .map(project => ({ project, placements: project.slots }));
  const hasProjects    = intakeProjectRows.length > 0;
  const uniqueAssignedIds = hasAttachmentRows
    ? new Set(attachments.map(attachment => attachment.projectId))
    : new Set(projects.map(project => project.id));
  const sharedProjectIds = hasAttachmentRows
    ? new Set(
        Array.from(uniqueAssignedIds).filter(projectId =>
          attachments.filter(attachment => attachment.projectId === projectId).length > 1,
        ),
      )
    : new Set<string>();
  const assignedProjectRows: AssignedProjectRow[] = intakeProjectRows.map(({ project, placements }) => ({
    project,
    placements,
    scopeLabel: sharedProjectIds.has(project.id) ? 'Shared project' : 'Single intake',
    statusLabel: assignedProjectStatusLabel(project.status),
  }));
  const assignedScopeOptions = ['Single intake', 'Shared project'];
  const assignedStatusOptions = ['Filled', 'Partially Filled', 'Open'];
  const assignedQuery = assignedSearch.trim().toLowerCase();
  const assignedFiltersActive = assignedQuery.length > 0 || assignedScopeFilter !== 'all' || assignedStatusFilter !== 'all';
  const visibleAssignedProjectRows = assignedProjectRows
    .filter(row => {
      if (!assignedQuery) return true;
      return `${row.project.title} ${row.project.mentor ?? ''}`.toLowerCase().includes(assignedQuery);
    })
    .filter(row => assignedScopeFilter === 'all' || row.scopeLabel === assignedScopeFilter)
    .filter(row => assignedStatusFilter === 'all' || row.statusLabel === assignedStatusFilter)
    .sort((a, b) => {
      if (!assignedSortCol) return 0;
      const getValue = (row: AssignedProjectRow): string | number => {
        if (assignedSortCol === 'title') return row.project.title;
        if (assignedSortCol === 'mentor') return row.project.mentor ?? '';
        if (assignedSortCol === 'placements') return row.placements;
        if (assignedSortCol === 'scope') return row.scopeLabel;
        return row.statusLabel;
      };
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * assignedSortDir;
      return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * assignedSortDir;
    });
  const visibleAssignedPlacementTotal = visibleAssignedProjectRows.reduce((total, row) => total + row.placements, 0);
  const placementTotal = hasAttachmentRows
    ? Array.from(new Set(attachments.map(a => a.projectId)))
        .reduce((total, pid) => total + (projectById.get(pid)?.slots ?? 0), 0)
    : projects.reduce((total, p) => total + (p.slots ?? 0), 0);
  const intakeStat: AppStat = {
    total:    (appStats.byIntake[selIntake.id]?.total ?? 0) + (isFirstIntake ? (appStats.untagged[prog.id]?.total ?? 0) : 0),
    newCount: (appStats.byIntake[selIntake.id]?.newCount ?? 0) + (isFirstIntake ? (appStats.untagged[prog.id]?.newCount ?? 0) : 0),
  };

  function reviewApplications() {
    try { localStorage.setItem('dsta_app_pending_category', selectedCat); } catch {}
    router.push('/applications');
  }

  function sortAssignedProjects(col: string) {
    const nextCol = col as AssignedProjectSortCol;
    if (assignedSortCol !== nextCol) {
      setAssignedSortCol(nextCol);
      setAssignedSortDir(1);
      return;
    }
    if (assignedSortDir === 1) {
      setAssignedSortDir(-1);
      return;
    }
    setAssignedSortCol(null);
    setAssignedSortDir(1);
  }

  return (
    <Shell activeRoute="/programmes">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4 text-label-md">
        <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/programmes')}>Programmes</span>
        <ChevronRight size={16} className="text-fg-subtle" />
        <span className="text-fg truncate max-w-[400px]">{prog.title}</span>
      </nav>

      {/* Page header */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-headline-lg text-fg">{prog.title}</h1>
          <StatusBadge status={prog.status} />
          {catList.length > 1 && (
            <ProgToggle
              options={catList.map(c => ({ value: c, label: c }))}
              value={selectedCat}
              onChange={setActiveCat}
            />
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {prog.status === 'Draft' && (
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              <PlayCircle size={16} className="text-accent" />
              <span className="text-accent">Activate</span>
            </Button>
          )}
          {prog.status === 'Active' && (
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              <CheckCircle2 size={16} className="text-success" />
              <span className="text-success">Mark Completed</span>
            </Button>
          )}
          {prog.status !== 'Completed' && (
            <Button onClick={handleEdit}><Pencil size={16} />Edit</Button>
          )}
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={16} className="text-danger" /><span className="text-danger">Delete</span>
          </Button>
        </div>
      </div>

      {/* Summary dashboard */}
      <div className="grid gap-3 mb-5 sm:grid-cols-4">
        <DetailMetric value={intakes.length} label={intakes.length === 1 ? 'intake' : 'intakes'} />
        <DetailMetric value={uniqueAssignedIds.size} label="assigned projects" />
        <DetailMetric value={sharedProjectIds.size} label="shared projects" />
        <DetailMetric value={placementTotal} label="placements" />
      </div>

      {/* Programme-level details */}
      <div className="grid grid-cols-1 gap-5 mb-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="p-6">
          <h2 className="text-headline-md text-fg mb-5">Programme Details</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            <div>
              <p className="text-caption text-fg-muted mb-1">Programme ID</p>
              <p className="text-body-sm font-medium font-mono text-fg">{prog.id}</p>
            </div>
            <div>
              <p className="text-caption text-fg-muted mb-1">Intern Category</p>
              <CategoryBadge category={prog.educationLevel} />
            </div>
            <div>
              <p className="text-caption text-fg-muted mb-1">Intakes</p>
              <p className="text-body-sm font-medium text-fg">{intakes.length} {intakes.length === 1 ? 'intake' : 'intakes'}</p>
            </div>
            {prog.description && (
              <div className="col-span-2">
                <p className="text-caption text-fg-muted mb-1">Description</p>
                <p className="text-body-sm leading-relaxed text-fg max-w-[80ch]">{prog.description}</p>
              </div>
            )}
            <div className="col-span-2 pt-1 border-t border-border">
              <p className="text-caption text-fg-muted mb-2">Application Form</p>
              {formTemplate ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-fg truncate">{formTemplate.name}</p>
                      <p className="text-caption text-fg-subtle">
                        {(formTemplate.fields ?? []).filter(f => !f.hidden).length} fields - Updated {formTemplate.updatedAt}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormDrawerOpen(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm font-medium text-fg-muted hover:text-accent hover:border-accent/50 transition-colors"
                  >
                    <FileText size={13} />Preview
                  </button>
                </div>
              ) : (
                <p className="text-body-sm text-fg-muted italic">No form linked - assign one when editing this programme.</p>
              )}
            </div>
          </div>
        </Card>

        <EligibilitySection groups={prog.requirements ?? []} />
      </div>

      {/* Intake Windows - switcher + selected intake summary */}
      <Card className="p-6 mb-5">
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <h2 className="text-headline-md text-fg">Intake Windows</h2>
          {intakes.length > 1 && (
            <div className="inline-flex rounded-lg border border-border bg-bg-subtle p-0.5 overflow-x-auto max-w-full">
              {intakes.map(it => (
                <button
                  key={it.id}
                  onClick={() => setSelIntakeId(it.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-body-sm font-medium whitespace-nowrap transition-colors',
                    it.id === selIntake.id ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {intakeLabel(it)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
          <div>
            <p className="text-caption text-fg-muted mb-1">Application Window</p>
            {selIntake.appOpen && selIntake.appClose ? (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-body-sm font-medium text-fg">{formatDate(selIntake.appOpen)} - {formatDate(selIntake.appClose)}</p>
                {intakeAppStatus && <AppStatusBadge status={intakeAppStatus} />}
              </div>
            ) : (
              <p className="text-body-sm text-fg-muted italic">Not configured</p>
            )}
          </div>
          <div>
            <p className="text-caption text-fg-muted mb-1">Internship Period</p>
            <p className="text-body-sm font-medium text-fg">
              {selIntake.start && selIntake.end ? `${fmtMonth(selIntake.start)} - ${fmtMonth(selIntake.end)}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-caption text-fg-muted mb-1">Applications</p>
            {prog.status === 'Draft' ? (
              <p className="text-body-sm text-fg-muted italic">Opens once active</p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-body-sm font-medium text-fg flex items-center gap-1.5"><Users size={15} className="text-fg-muted" />{intakeStat.total}</span>
                {intakeStat.newCount > 0 && prog.status === 'Active' && intakeAppStatus === 'Open' && (
                  <Badge variant="warning" className="text-caption font-normal">{intakeStat.newCount} new</Badge>
                )}
                {intakeStat.total > 0 && (
                  <button onClick={reviewApplications} className="ml-1 inline-flex items-center gap-1 text-body-sm font-semibold text-accent hover:underline">
                    Review <ArrowRight size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Projects - scoped to the selected intake */}
        <div className="mt-5 border-t border-border pt-5">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-body-sm font-medium text-fg">Assigned Projects</h3>
            </div>
            {hasProjects && (
              <span className="text-body-sm text-fg-muted">
                {assignedFiltersActive ? `${visibleAssignedProjectRows.length} of ${intakeProjectRows.length} projects` : `${intakeProjectRows.length} projects`}
              </span>
            )}
          </div>
          {hasProjects ? (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
                <Input
                  aria-label="Search assigned projects"
                  placeholder="Search project or mentor"
                  value={assignedSearch}
                  onChange={event => setAssignedSearch(event.target.value)}
                />
                <Select
                  value={assignedScopeFilter}
                  onValueChange={value => setAssignedScopeFilter(value as 'all' | AssignedProjectRow['scopeLabel'])}
                >
                  <SelectTrigger aria-label="Filter assigned projects by scope">
                    {assignedScopeFilter === 'all' ? 'All scopes' : assignedScopeFilter}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scopes</SelectItem>
                    {assignedScopeOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={assignedStatusFilter}
                  onValueChange={value => setAssignedStatusFilter(value as 'all' | AssignedProjectRow['statusLabel'])}
                >
                  <SelectTrigger aria-label="Filter assigned projects by status">
                    {assignedStatusFilter === 'all' ? 'All statuses' : assignedStatusFilter}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {assignedStatusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignedFiltersActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAssignedSearch('');
                      setAssignedScopeFilter('all');
                      setAssignedStatusFilter('all');
                    }}
                  >
                    Clear
                  </Button>
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>
              {visibleAssignedProjectRows.length > 0 ? (
                <Table className="text-left">
                  <TableHeader className="bg-bg-subtle">
                    <TableRow>
                      <SortTh col="title" label="Project Title" sortCol={assignedSortCol} sortDir={assignedSortDir} onSort={sortAssignedProjects} className="min-w-[260px]" />
                      <SortTh col="mentor" label="Mentor" sortCol={assignedSortCol} sortDir={assignedSortDir} onSort={sortAssignedProjects} />
                      <SortTh col="placements" label={`Placements (${visibleAssignedPlacementTotal})`} sortCol={assignedSortCol} sortDir={assignedSortDir} onSort={sortAssignedProjects} />
                      <SortTh col="scope" label="Scope" sortCol={assignedSortCol} sortDir={assignedSortDir} onSort={sortAssignedProjects} />
                      <SortTh col="status" label="Status" sortCol={assignedSortCol} sortDir={assignedSortDir} onSort={sortAssignedProjects} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAssignedProjectRows.map(({ project, placements, scopeLabel, statusLabel }) => (
                      <TableRow key={project.id}>
                        <TableCell className="px-4 py-3 font-medium">{project.title}</TableCell>
                        <TableCell className="px-4 py-3 text-fg-muted">{project.mentor}</TableCell>
                        <TableCell className="px-4 py-3 text-fg-muted">{placements}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="neutral" className="text-caption font-normal">
                            {scopeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant={statusLabel === 'Filled' ? 'success' : statusLabel === 'Partially Filled' ? 'warning' : 'neutral'}
                            className="text-caption font-normal"
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="No projects match"
                  description="Adjust the search, scope, or status filters to see more assigned projects."
                  size="sm"
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={Layers}
              title="No assigned projects"
              description={`Assign approved projects to ${intakes.length > 1 ? 'this intake' : 'the programme'} when editing, or once submissions have been reviewed and approved.`}
              size="sm"
            />
          )}
        </div>
      </Card>


      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-start gap-3 border-t border-border bg-surface/95 px-[clamp(24px,2.6vw,40px)] py-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur">
        <Button variant="outline" onClick={() => router.push('/programmes')}>
          Back
        </Button>
      </div>

      {/* Application form preview */}
      {formTemplate && formDrawerOpen && (
        <ApplicationFormPreviewModal
          template={formTemplate}
          onClose={() => setFormDrawerOpen(false)}
        />
      )}

      {/* Activate modal */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} labelledBy="programme-status-title">
        {prog.status === 'Draft' ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <PlayCircle size={18} className="text-accent" />
              </div>
              <h2 id="programme-status-title" className="text-headline-md text-fg">Activate Programme</h2>
            </div>
            <p className="text-body-md text-fg-muted mb-1">This will mark <strong className="text-fg">{prog.title}</strong> as Active.</p>
            <p className="text-body-sm text-fg-muted mb-4">Active programmes are visible to applicants once the application window opens.</p>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => advanceStatus('Active')}><PlayCircle size={16} />Activate</Button>
              <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success-bg flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-success" />
              </div>
              <h2 id="programme-status-title" className="text-headline-md text-fg">Mark as Completed</h2>
            </div>
            <p className="text-body-md text-fg-muted mb-1">This will close <strong className="text-fg">{prog.title}</strong> and mark it as Completed.</p>
            <p className="text-body-sm text-fg-muted mb-6">No new applications will be accepted. This can be changed later via Edit.</p>
            <div className="flex gap-3 justify-end">
              <Button onClick={() => advanceStatus('Completed')}><CheckCircle2 size={16} />Mark as Completed</Button>
              <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} labelledBy="delete-programme-detail-title">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-danger" />
          </div>
          <h2 id="delete-programme-detail-title" className="text-headline-md text-fg">Delete Programme</h2>
        </div>
        <p className="text-body-md text-fg-muted mb-1">Are you sure you want to delete</p>
        <p className="text-body-md font-semibold text-fg mb-1">"{prog.title}"</p>
        <p className="text-body-sm text-fg-muted mb-6">This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="danger" onClick={confirmDelete}><Trash2 size={16} />Delete</Button>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </Shell>
  );
}
