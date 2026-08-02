'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useTransition, Fragment, Children, isValidElement, memo } from 'react';
import type { OptionHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Checkbox } from '@/components/ui/checkbox';
import Combobox from '@/components/ui-legacy/combobox';
import DateRangePicker from '@/components/ui-legacy/date-range-picker';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLabelText,
} from '@/components/ui-legacy/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-legacy/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import EmptyState from '@/components/ui-legacy/empty-state';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2,
  ChevronRight, Eye, FileInput, FileOutput, Folder, Info, Pencil, Plus, Save, ShieldCheck, Sparkles, Trash2, X,
} from 'lucide-react';
import { REQ_TYPES, REQ_TIER_LABELS, EDUCATION_LEVELS, OPS, loadSubjectTaxonomy, toEducationLevel } from '@/lib/data';
import { loadProgrammes, saveProgrammes, loadProjects, saveProjects, loadAttachments, saveAttachments } from '@/lib/storage';
import { poolFor, attachWarnings } from '@/lib/attachments';
import { PROGRAMMES_CHANGED_EVENT } from '@/lib/programme-context';
import { formatDate, formatTimeline, calcDaysLeft, generateProgId, cn, joinOr, ruleToNatural, groupToNatural, generateEligibilitySummary, sgToday } from '@/lib/utils';
import { monthIndexFromISO, formatMMMYY, mmmyyToISO, mmmyyToISOEnd, isoToMMMYY, periodsOverlap, parseMMMYY, periodLabelToMMMYY, INTAKE_BASE_YEAR, DEFAULT_INTAKE_YEAR, INTAKE_YEARS, shiftMMMYY } from '@/lib/internship-period';

/** Normalise a stored internship-window value to an ISO day; legacy month values
   (MMMYY / "Jun 2026") become the first / last day of the month. */
function isoDay(v: string | undefined | null, isEnd: boolean): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = periodLabelToMMMYY(v);
  return m ? (isEnd ? mmmyyToISOEnd(m) : mmmyyToISO(m)) : '';
}

import type {
  Programme, ProgStatus, IntakeWindow,
  CriteriaGroup, CriteriaPathway, CriteriaRule, CriteriaMatchType, AppFormTemplate, FormField,
  Application, ApplicationStatus, ProjectEntry, ProjectAttachment, EducationLevel,
} from '@/lib/types';
import {
  programmeStep1Schema,
  programmeStep2Schema,
  flattenErrors,
  formatIntakeErrors,
} from '@/lib/validation';
import appFormSeed from '@/data/app-form-templates.json';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { useSystemConfig } from '@/lib/portal-config';
import { AI_COLOURS } from '@/lib/ai-colours';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
// import PreviewFlagFab from '@/components/dev/preview-flag-fab'; // DEV-ONLY — disabled for now (was: the floating preview-flag toggle on the programme form)

const AFT_KEY      = 'dsta_app_form_templates';
const AFT_SEED_VER = '23';
const AFT_VER_KEY  = 'dsta_app_form_templates_seed_v';


/* ── localStorage helpers ──────────────────────────────────────── */
function saveProgs(p: Programme[]) {
  saveProgrammes(p);
  window.dispatchEvent(new Event(PROGRAMMES_CHANGED_EVENT));
}

/* Stable intake ids so a project can bind to a SPECIFIC intake. Assigned when an
   intake is created and backfilled on existing programmes that predate the field. */
let _intakeSeq = 0;
function newIntakeId() { return `intk-${Date.now().toString(36)}-${_intakeSeq++}`; }
function withIntakeIds(ws: IntakeWindow[]): IntakeWindow[] {
  return ws.map(w => w.id ? w : { ...w, id: newIntakeId() });
}
/* "Jun26 – Dec26" label for an intake window (ISO start/end → MMMYY). */
function intakeLabel(w: IntakeWindow): string {
  const s = monthIndexFromISO(w.start), e = monthIndexFromISO(w.end);
  if (s === null || e === null) return 'dates not set';
  return `${formatMMMYY(s)} – ${formatMMMYY(e)}`;
}

/* Auto-derived intake title: programme name + internship window,
   e.g. "University 2027 (Jun27 – Dec27)". Falls back to the period when unnamed. */
function intakeTitleFor(programmeTitle: string, w: IntakeWindow): string {
  const period = intakeLabel(w);
  const name = programmeTitle.trim();
  if (!name) return period === 'dates not set' ? '' : period;
  return period === 'dates not set' ? name : `${name} (${period})`;
}

function hasPeriod(p: ProjectEntry) {
  return !!(p.internshipPeriodStart && p.internshipPeriodEnd);
}
function fitsIntake(p: ProjectEntry, w: IntakeWindow) {
  return hasPeriod(p) && periodsOverlap(w.start, w.end, p.internshipPeriodStart, p.internshipPeriodEnd);
}

interface ProjectTableRowProps {
  project: ProjectEntry;
  selectedIntake: IntakeWindow | undefined;
  selectedIntakeId: string | undefined;
  cpPlacement: Record<string, Record<string, number>>;
  assignedToIntake: Set<string>;
  onToggleAttach: (intakeId: string, projectId: string) => void;
  onOpenSingleAssign: (projectId: string, intakeId: string | undefined) => void;
  onOpenPeriodEdit: (project: ProjectEntry) => void;
}

const ProjectTableRow = memo(function ProjectTableRow({
  project: p,
  selectedIntake,
  selectedIntakeId,
  cpPlacement,
  assignedToIntake,
  onToggleAttach,
  onOpenSingleAssign,
  onOpenPeriodEdit,
}: ProjectTableRowProps) {
  const isAssigned = assignedToIntake.has(p.id);
  const periodFits = !!selectedIntake && fitsIntake(p, selectedIntake);
  const placements = selectedIntakeId ? (cpPlacement[selectedIntakeId]?.[p.id] ?? 1) : 1;

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold text-fg">{p.title}</p>
          <p className="text-caption text-fg-muted">{p.id}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-body-sm text-fg">{p.pc || '—'}</span>
      </TableCell>
      <TableCell>
        <span className="text-body-sm text-fg">{p.internshipDuration ? `${p.internshipDuration} Months` : '—'}</span>
      </TableCell>
      <TableCell>
        <span className="text-body-sm text-fg">{placements}</span>
      </TableCell>
      <TableCell>
        {hasPeriod(p) ? (
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-medium',
            periodFits ? 'border-success/30 bg-success-bg text-success' : 'border-warning/30 bg-warning-bg text-warning'
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', periodFits ? 'bg-success' : 'bg-warning')} />
            {periodFits ? 'Matches intake' : 'Date mismatch'}
          </span>
        ) : (
          <Button type="button" variant="link" size="xs" onClick={() => onOpenPeriodEdit(p)} className="px-0">
            Set period
          </Button>
        )}
      </TableCell>
      <TableCell className="text-right">
        {isAssigned ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => selectedIntakeId && onToggleAttach(selectedIntakeId, p.id)}
          >
            <FileOutput size={14} />
            Unassign
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onOpenSingleAssign(p.id, selectedIntakeId)}
          >
            <FileInput size={14} />
            Assign
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});

/* Internship-window presets per intern category (MOM A7) — the same seasonal
   windows the project-request flow offers. Picking a category on step 1 seeds
   step 2's intakes with these windows already chosen; the officer still sets each
   intake's application window by hand. Values are MMMYY, anchored to the base
   intake year. */
const CATEGORY_INTAKE_PRESETS: Record<string, { start: string; end: string }[]> = {
  'Junior College Scholar/Junior College Student': [
    { start: 'Jun26', end: 'Jun26' },
    { start: 'Dec26', end: 'Dec26' },
  ],
  'Post Junior College/Post Polytechnic Student': [
    { start: 'Jan26', end: 'Jun26' },
  ],
  'Polytechnic Scholar/Polytechnic Student': [
    { start: 'Mar26', end: 'Aug26' },
    { start: 'Sep26', end: 'Feb27' },
    { start: 'Mar26', end: 'Feb27' },
  ],
  'Undergraduate Scholar/Merit Scholar': [
    { start: 'Jan26', end: 'Jun26' },
    { start: 'May26', end: 'Sep26' },
    { start: 'Jul26', end: 'Dec26' },
    { start: 'Jan26', end: 'Dec26' },
  ],
  'Young Defence Scientist Programme': [
    { start: 'Sep26', end: 'Dec26' },
  ],
};
// Undergraduate Student and Tech UP share three intakes (no Jan – Dec, unlike the Scholar/Merit Scholar track).
CATEGORY_INTAKE_PRESETS['Undergraduate Student'] = [
  { start: 'Jan26', end: 'Jun26' },
  { start: 'May26', end: 'Aug26' },
  { start: 'Jul26', end: 'Dec26' },
];
CATEGORY_INTAKE_PRESETS['Tech UP'] = CATEGORY_INTAKE_PRESETS['Undergraduate Student'];

/* ── Requirement helpers ────────────────────────────────────────── */
function selectInitVal(cfg: { kind: string; opts?: string[] }): string | string[] {
  if (cfg.kind === 'multiselect' || cfg.kind === 'subject-grade') return [];
  if (cfg.kind === 'select') return cfg.opts?.[0] ?? '';
  return '';
}

function makeNewRule(id: number): CriteriaRule {
  // Default to the first academic-tier type (not a baseline type like citizenship,
  // which would be hidden from the academic builder and jump to the Basics panel).
  const t = REQ_TYPES.find(t => t.tier === 'academic') ?? REQ_TYPES[0];
  return { id, type: t.key, operator: OPS[t.kind]?.[0] ?? '', value: selectInitVal(t) };
}
function makeNewGroup(id: number): CriteriaGroup {
  return { id, matchType: 'ANY', rules: [], pathways: [] };
}
function makeNewPathway(id: number): CriteriaPathway {
  return { id, rules: [] };
}

/* ── Req read-only view ─────────────────────────────────────────── */
/* ── Narrative helpers (Step 3 review) ─────────────────────────── */
function ruleToSentence(r: CriteriaRule): string {
  const cfg = REQ_TYPES.find(t => t.key === r.type);
  const label = cfg?.label ?? r.type;
  if (!cfg) return label;

  if (cfg.kind === 'subject-grade') {
    const subjects = Array.isArray(r.value) && r.value.length > 0
      ? r.value.join(', ') : 'any subject';
    const grade = r.gradeValue || '—';
    return `${label}: ${subjects}, minimum grade ${grade}`;
  }

  if (cfg.kind === 'multiselect') {
    const vals = Array.isArray(r.value) ? (r.value as string[]) : [];
    if (vals.length === 0) return label;
    if (vals.length === 1) return `${label}: ${vals[0]}`;
    if (vals.length === 2) return `${label}: ${vals[0]} or ${vals[1]}`;
    return `${label}: ${vals.slice(0, -1).join(', ')}, or ${vals[vals.length - 1]}`;
  }

  const val = Array.isArray(r.value)
    ? (r.value.length > 0 ? r.value.join(', ') : '—')
    : (r.value || '—');
  const scope = r.type === 'gpa' && r.institutions?.length ? ` — for ${r.institutions.join(' / ')}` : '';
  return `${label}: ${r.operator} ${val}${scope}`;
}

function ReqNarrativeView({ groups }: { groups: CriteriaGroup[] }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-8 px-4">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mb-3">
          <ShieldCheck size={20} className="text-success" />
        </div>
        <p className="text-body-sm font-semibold text-fg mb-1">Open to all applicants</p>
        <p className="text-caption text-fg-muted leading-relaxed">No restrictions set — anyone who applies will be considered.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && (
            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-label-sm font-semibold text-fg-muted">and</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          <div className="rounded-lg border border-border bg-surface px-3 py-3">
            <p className="text-label-sm font-semibold text-fg-muted mb-2">
              {group.matchType === 'ANY' ? 'At least one of:' : 'All of the following:'}
            </p>
            {group.matchType === 'ALL' ? (
              group.rules.length === 0
                ? <p className="text-caption text-fg-muted italic">No conditions added yet</p>
                : <ul className="space-y-1">
                    {group.rules.map(r => (
                      <li key={r.id} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-[6px] shrink-0" />
                        <span className="text-body-sm text-fg leading-snug">{ruleToSentence(r)}</span>
                      </li>
                    ))}
                  </ul>
            ) : (
              (group.pathways ?? []).length === 0
                ? <p className="text-caption text-fg-muted italic">No options added yet</p>
                : <div className="space-y-2">
                    {(group.pathways ?? []).map((pathway, pi) => (
                      <div key={pathway.id}>
                        {pi > 0 && (
                          <div className="flex items-center gap-2 py-1">
                            <div className="h-px flex-1 bg-border/50" />
                            <span className="text-label-sm font-semibold text-fg-muted">or</span>
                            <div className="h-px flex-1 bg-border/50" />
                          </div>
                        )}
                        <div className="rounded-lg bg-bg-subtle/60 px-3 py-2">
                          <p className="text-label-sm font-semibold text-fg-subtle mb-1.5">Option {pi + 1}</p>
                          {pathway.rules.length === 0
                            ? <p className="text-caption text-fg-muted italic">Empty</p>
                            : <ul className="space-y-1">
                                {pathway.rules.map(r => (
                                  <li key={r.id} className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-[6px] shrink-0" />
                                    <span className="text-body-sm text-fg leading-snug">{ruleToSentence(r)}</span>
                                  </li>
                                ))}
                              </ul>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Universities a GPA threshold can be scoped to (TOA-063). Matched against
   app.school by substring, so the short codes line up with seed data. */
const UNI_SCOPE_OPTS = ['NUS', 'NTU', 'SUTD', 'SMU', 'SIT', 'SUSS', 'SIM'];
function toggleArr(arr: string[] | undefined, v: string): string[] {
  const a = arr ?? [];
  return a.includes(v) ? a.filter(x => x !== v) : [...a, v];
}

/* ── Rule row ───────────────────────────────────────────────────── */
function RuleRow({
  rule, onTypeChange, onOpChange, onValChange, onMultiToggle,
  onGradeChange, onInstToggle, onRemove, subjectOpts,
}: {
  rule:           CriteriaRule;
  onTypeChange:   (v: string) => void;
  onOpChange:     (v: string) => void;
  onValChange:    (v: string | string[]) => void;
  onMultiToggle:  (v: string) => void;
  onGradeChange?: (v: string) => void;
  onInstToggle?:  (v: string) => void;
  onRemove:       () => void;
  subjectOpts?:   Record<string, string[]>;  // live recognised-subject taxonomy (TOA-068)
}) {
  const cfg      = REQ_TYPES.find(t => t.key === rule.type) ?? REQ_TYPES[0];
  const selected = Array.isArray(rule.value) ? rule.value as string[] : [];
  // Subject-grade rules use the admin-editable recognised-subject list when available.
  const liveOpts = cfg.kind === 'subject-grade' ? (subjectOpts?.[rule.type] ?? cfg.opts) : cfg.opts;

  return (
    <div className="relative flex items-start gap-2 py-2.5 pr-8 border-b border-border/40 last:border-0 last:pb-0 flex-wrap">
      {/* Criterion type */}
      <Select
        modal={false}
        value={rule.type}
        onValueChange={value => onTypeChange(value ?? '')}
      >
          <SelectTrigger className="w-[176px] shrink-0 bg-surface">
            <SelectValue>
              {() => <span className="truncate">{cfg.label}</span>}
            </SelectValue>
          </SelectTrigger>
        <SelectContent>
          {/* Palette sectioned by tier. Nationality and Race are baseline-only (managed
              in the Basics panel) so they're excluded; Education stays available because
              a pathway can pin its own level, and is shown under Academic. */}
          {REQ_TIER_LABELS.map(({ tier, label }, ti) => {
            const items = REQ_TYPES.filter(t => (t.tier === 'basic' ? 'academic' : t.tier) === tier && t.key !== 'citizenship' && t.key !== 'race');
            if (items.length === 0) return null;
            return (
              <Fragment key={tier}>
                <div className={cn('px-2 pb-1 text-label-sm font-semibold uppercase tracking-wide text-fg-subtle', ti === 0 ? 'pt-1' : 'pt-2')}>{label}</div>
                {items.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </Fragment>
            );
          })}
        </SelectContent>
      </Select>

      {/* Operator / label */}
      {cfg.kind === 'multiselect' ? (
        <span className="text-body-sm text-fg-muted shrink-0 h-9 flex items-center">is any of</span>
      ) : cfg.kind === 'subject-grade' ? (
        <>
          <span className="text-body-sm text-fg-muted shrink-0 h-9 flex items-center">min grade</span>
          <Select
            modal={false}
            value={rule.gradeValue ?? ''}
            onValueChange={value => onGradeChange?.(value ?? '')}
          >
            <SelectTrigger className="w-[84px] shrink-0 bg-surface">
              <SelectValue className="truncate" placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              {cfg.gradeOpts?.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      ) : (
        <Select
          modal={false}
          value={rule.operator}
          onValueChange={value => onOpChange(value ?? '')}
        >
          <SelectTrigger className="w-[100px] shrink-0 bg-surface">
            <SelectValue className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {OPS[cfg.kind]?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {/* Value */}
      {cfg.kind === 'select' && (
        <Select
          modal={false}
          value={rule.value as string}
          onValueChange={value => onValChange(value ?? '')}
        >
          <SelectTrigger className="w-[160px] shrink-0 bg-surface">
            <SelectValue className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {cfg.opts?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {(cfg.kind === 'text' || cfg.kind === 'number') && (
        <Input
          type={cfg.kind}
          value={rule.value as string}
          placeholder={cfg.placeholder}
          step={cfg.step}
          onChange={e => onValChange(e.target.value)}
          className="w-[160px] shrink-0"
        />
      )}
      {(cfg.kind === 'multiselect' || cfg.kind === 'subject-grade') && (
        <div className="w-full shrink-0">
          <Combobox
            selected={selected}
            onToggle={onMultiToggle}
            options={cfg.groups ? undefined : liveOpts}
            groups={cfg.groups}
            placeholder={cfg.placeholder ?? `Select ${cfg.label.toLowerCase()}…`}
            searchOnly={!!cfg.searchable}
          />
        </div>
      )}

      {/* GPA institution scope (TOA-063) — threshold applies only to these schools */}
      {rule.type === 'gpa' && onInstToggle && (
        <>
          <span className="text-body-sm text-fg-muted shrink-0 h-9 flex items-center">for</span>
          <div className="w-[200px] shrink-0">
            <Combobox
              selected={rule.institutions ?? []}
              onToggle={onInstToggle}
              options={UNI_SCOPE_OPTS}
              placeholder="All institutions"
            />
          </div>
        </>
      )}

      {/* Remove — pinned to top-right */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-0 top-4 w-6 h-6 rounded-full flex items-center justify-center text-fg-subtle hover:bg-danger-bg hover:text-danger transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ── Baseline (basic-tier) helpers ──────────────────────────────────
   Nationality + Intern Category are implied by the programme itself, so they
   live in their own compact panel (BasicsPanel) rather than mixed into the
   criteria list. They stay ordinary rules in the data — the auto-screener keys
   off the Citizenship label ([applications] evalGroup) — we just surface and
   hide them by identity. "Top-level" = a direct group rule, NOT a pathway rule
   (education pinned inside an academic pathway is genuine academic logic and
   stays in the builder). */
const NATIONALITY_OPTS = REQ_TYPES.find(t => t.key === 'citizenship')?.opts ?? [];

const RACE_OPTS = ['Chinese', 'Malay', 'Indian', 'Others'] as const;

/* Fields available in the Basic Requirements builder. Each maps to a real rule
   type; `options` drives its value dropdown and `op` the stored operator. `multi`
   fields store their value as an array ("is any of"); the rest as a scalar. Only
   top-level rules of these types count as baseline — the same type pinned inside
   an academic pathway stays genuine builder logic and is left in the builder. */
const BASELINE_FIELDS: { key: string; label: string; op: string; options: readonly string[]; multi?: boolean; placeholder?: string }[] = [
  { key: 'citizenship', label: 'Nationality',    op: 'is any of', options: NATIONALITY_OPTS,  multi: true, placeholder: 'Select nationality…' },
  { key: 'education',   label: 'Intern Category', op: 'is',        options: EDUCATION_LEVELS,               placeholder: 'Select level…' },
  { key: 'race',        label: 'Race',           op: 'is any of', options: RACE_OPTS,          multi: true, placeholder: 'Select race…' },
];
const BASELINE_TYPES = new Set(BASELINE_FIELDS.map(f => f.key));
const baselineField = (type: string) => BASELINE_FIELDS.find(f => f.key === type);
const emptyBaselineValue = (type: string): string | string[] => (baselineField(type)?.multi ? [] : '');

function baselineRuleIds(groups: CriteriaGroup[]): Set<number> {
  const ids = new Set<number>();
  for (const g of groups) for (const r of g.rules) {
    if (BASELINE_TYPES.has(r.type)) ids.add(r.id);
  }
  return ids;
}
function patchTopRuleById(groups: CriteriaGroup[], id: number, patch: Partial<CriteriaRule>): CriteriaGroup[] {
  return groups.map(g => ({ ...g, rules: g.rules.map(r => r.id === id ? { ...r, ...patch } : r) }));
}
function nextRuleId(groups: CriteriaGroup[]): number {
  const ids = groups.flatMap(g => [g.id, ...g.rules.map(r => r.id), ...(g.pathways ?? []).flatMap(p => [p.id, ...p.rules.map(r => r.id)])]);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

/* ── Basic Requirements builder ──────────────────────────────────────
   A compact rule builder for the baseline gates: add a field, choose its type
   (Nationality, Intern Category, …) and set the value beside it. The value
   control differs by field. These rules are hidden from the academic builder so
   they're only edited here; a field type can be used at most once. */
function BasicsPanel({ groups, onChange }: {
  groups: CriteriaGroup[]; onChange: (g: CriteriaGroup[]) => void;
}) {
  // One row per top-level baseline rule, in document order.
  const rows: CriteriaRule[] = [];
  for (const g of groups) for (const r of g.rules) if (BASELINE_TYPES.has(r.type)) rows.push(r);
  const usedTypes = new Set(rows.map(r => r.type));
  const nextUnused = BASELINE_FIELDS.find(f => !usedTypes.has(f.key));

  function patchRule(id: number, patch: Partial<CriteriaRule>) {
    onChange(patchTopRuleById(groups, id, patch));
  }
  function changeType(id: number, newType: string) {
    // Switching field resets the value/operator to the new field's defaults.
    patchRule(id, { type: newType, operator: baselineField(newType)?.op ?? '', value: emptyBaselineValue(newType), gradeValue: undefined, institutions: undefined });
  }
  function removeRule(id: number) {
    onChange(groups.map(g => ({ ...g, rules: g.rules.filter(r => r.id !== id) })));
  }
  function addField() {
    if (!nextUnused) return;
    const base = { type: nextUnused.key, operator: nextUnused.op, value: emptyBaselineValue(nextUnused.key) };
    if (groups.length === 0) {
      onChange([{ id: 1, matchType: 'ALL', rules: [{ id: 2, ...base }], pathways: [] }]);
    } else {
      const rule: CriteriaRule = { id: nextRuleId(groups), ...base };
      onChange(groups.map((g, i) => (i === 0 ? { ...g, rules: [...g.rules, rule] } : g)));
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      {rows.length === 0 ? (
        <p className="px-4 py-4 text-caption italic text-fg-muted">No basic requirements yet — add a field to gate who can apply.</p>
      ) : (
        <div className="divide-y divide-border/60">
          {rows.map(rule => {
            const field = baselineField(rule.type);
            // Offer this row's own type plus any type not already used elsewhere.
            const typeOpts = BASELINE_FIELDS.filter(o => o.key === rule.type || !usedTypes.has(o.key));
            // multi fields keep the value as an array ("is any of"); others as a scalar.
            const selected = field?.multi
              ? ((Array.isArray(rule.value) ? rule.value[0] : (rule.value as string)) ?? '')
              : ((rule.value as string) ?? '');
            return (
              <div key={rule.id} className="flex items-center gap-2 px-3 py-2.5">
                {/* Field type */}
                <Select modal={false} value={rule.type} onValueChange={v => v && changeType(rule.id, v)}>
                  <SelectTrigger className="w-[176px] shrink-0 bg-surface">
                    <SelectValue>
                      {() => <span className="truncate">{field?.label ?? 'Select field'}</span>}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>{typeOpts.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
                </Select>

                {/* Value — options come from the chosen field */}
                <div className="w-[200px] shrink-0">
                  <Select
                    modal={false}
                    value={selected}
                    onValueChange={v => patchRule(rule.id, { value: field?.multi ? (v ? [v] : []) : (v ?? '') })}
                  >
                    <SelectTrigger className="bg-surface"><SelectValue className="truncate" placeholder={field?.placeholder ?? 'Select…'} /></SelectTrigger>
                    <SelectContent>{(field?.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeRule(rule.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-all hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border px-3 py-2.5">
        <Button type="button" variant="ghost" size="xs" onClick={addField} disabled={!nextUnused}>
          <Plus size={14} />Add field
        </Button>
      </div>
    </div>
  );
}

/* ── Requirement builder (step 2) ───────────────────────────────── */
function ReqBuilder({ groups, onChange, hiddenRuleIds }: { groups: CriteriaGroup[]; onChange: (g: CriteriaGroup[]) => void; hiddenRuleIds?: Set<number> }) {
  const hidden = hiddenRuleIds ?? new Set<number>();
  // Live recognised-subject taxonomy (TOA-068) — admin edits show up in the subject pickers.
  const [subjectOpts] = useState<Record<string, string[]>>(() => loadSubjectTaxonomy());
  const [counter, setCounter] = useState(() => {
    const allIds = groups.flatMap(g => [
      g.id,
      ...g.rules.map(r => r.id),
      ...(g.pathways ?? []).flatMap(p => [p.id, ...p.rules.map(r => r.id)]),
    ]);
    return allIds.length > 0 ? Math.max(...allIds) + 1 : 0;
  });

  function nextId() { const id = counter; setCounter(c => c + 1); return id; }

  function addGroup() {
    const gid = nextId();
    const pid = nextId();
    const rid = nextId();
    onChange([
      ...groups,
      {
        ...makeNewGroup(gid),
        pathways: [{ ...makeNewPathway(pid), rules: [makeNewRule(rid)] }],
      },
    ]);
  }
  function removeGroup(gid: number) { onChange(groups.filter(g => g.id !== gid)); }

  function toggleMatchType(gid: number) {
    const g = groups.find(g => g.id === gid);
    if (!g) return;
    if (g.matchType === 'ALL') {
      // ALL → ANY: wrap existing rules into first pathway so no data is lost
      const firstPathway = g.rules.length > 0 ? [{ id: nextId(), rules: g.rules }] : [];
      onChange(groups.map(grp => grp.id !== gid ? grp : { ...grp, matchType: 'ANY' as CriteriaMatchType, pathways: firstPathway, rules: [] }));
    } else {
      // ANY → ALL: flatten all pathway rules into a single list
      onChange(groups.map(grp => grp.id !== gid ? grp : { ...grp, matchType: 'ALL' as CriteriaMatchType, rules: (grp.pathways ?? []).flatMap(p => p.rules), pathways: [] }));
    }
  }

  // ── ALL-group rule operations ─────────────────────────────────
  function addRule(gid: number) {
    onChange(groups.map(g => g.id === gid ? { ...g, rules: [...g.rules, makeNewRule(nextId())] } : g));
  }
  function removeRule(gid: number, rid: number) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, rules: g.rules.filter(r => r.id !== rid) }));
  }
  function updateRule(gid: number, rid: number, patch: Partial<CriteriaRule>) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, ...patch } : r) }));
  }
  function onTypeChange(gid: number, rid: number, type: string) {
    const cfg = REQ_TYPES.find(t => t.key === type)!;
    onChange(groups.map(g => g.id !== gid ? g : { ...g, rules: g.rules.map(r => r.id === rid ? { ...r, type, value: selectInitVal(cfg), gradeValue: cfg.kind === 'subject-grade' ? '' : undefined, operator: OPS[cfg.kind]?.[0] ?? '' } : r) }));
  }
  function onMultiToggle(gid: number, rid: number, val: string) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, rules: g.rules.map(r => {
      if (r.id !== rid) return r;
      const vals = Array.isArray(r.value) ? r.value : [];
      return { ...r, value: vals.includes(val) ? vals.filter(v => v !== val) : [...vals, val] };
    })}));
  }

  // ── ANY-group pathway operations ──────────────────────────────
  function addPathway(gid: number) {
    const pid = nextId();
    const rid = nextId();
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: [...(g.pathways ?? []), { ...makeNewPathway(pid), rules: [makeNewRule(rid)] }] }));
  }
  function removePathway(gid: number, pid: number) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: (g.pathways ?? []).filter(p => p.id !== pid) }));
  }
  function addPathwayRule(gid: number, pid: number) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: (g.pathways ?? []).map(p => p.id !== pid ? p : { ...p, rules: [...p.rules, makeNewRule(nextId())] }) }));
  }
  function removePathwayRule(gid: number, pid: number, rid: number) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: (g.pathways ?? []).map(p => p.id !== pid ? p : { ...p, rules: p.rules.filter(r => r.id !== rid) }) }));
  }
  function updatePathwayRule(gid: number, pid: number, rid: number, patch: Partial<CriteriaRule>) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: (g.pathways ?? []).map(p => p.id !== pid ? p : { ...p, rules: p.rules.map(r => r.id === rid ? { ...r, ...patch } : r) }) }));
  }
  function onPathwayTypeChange(gid: number, pid: number, rid: number, type: string) {
    const cfg = REQ_TYPES.find(t => t.key === type)!;
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: (g.pathways ?? []).map(p => p.id !== pid ? p : { ...p, rules: p.rules.map(r => r.id === rid ? { ...r, type, value: selectInitVal(cfg), gradeValue: cfg.kind === 'subject-grade' ? '' : undefined, operator: OPS[cfg.kind]?.[0] ?? '' } : r) }) }));
  }
  function onPathwayMultiToggle(gid: number, pid: number, rid: number, val: string) {
    onChange(groups.map(g => g.id !== gid ? g : { ...g, pathways: (g.pathways ?? []).map(p => p.id !== pid ? p : { ...p, rules: p.rules.map(r => {
      if (r.id !== rid) return r;
      const vals = Array.isArray(r.value) ? r.value : [];
      return { ...r, value: vals.includes(val) ? vals.filter(v => v !== val) : [...vals, val] };
    }) }) }));
  }

  // Baseline (Nationality / Intern Category) rules are shown in the Basics panel,
  // so they are hidden here. A group left with no visible rules and no pathways
  // (e.g. the seeded Nationality-only group) drops out of the builder entirely.
  const isGroupVisible = (g: CriteriaGroup) =>
    g.matchType === 'ANY' ? (g.pathways ?? []).length > 0 : g.rules.some(r => !hidden.has(r.id));
  const visibleGroups = groups.filter(isGroupVisible);

  return (
    <div>
      {visibleGroups.length === 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <p className="px-4 py-6 text-center text-caption italic text-fg-muted">
            No academic requirements yet — applicants only need to meet the basics above.
          </p>
          <div className="border-t border-border px-3 py-2.5">
            <Button type="button" variant="ghost" size="xs" onClick={addGroup}>
              <Plus size={14} />Add field
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {visibleGroups.map((group, gi) => {
            const visibleRules = group.rules.filter(r => !hidden.has(r.id));
            // all/any toggle + remove — kept from the old group header, slimmed down.
            const groupControls = (
              <div className="flex items-center gap-1.5">
                <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
                  <Button type="button" variant={group.matchType === 'ALL' ? 'primary' : 'ghost'} size="xs"
                    onClick={() => group.matchType === 'ANY' && toggleMatchType(group.id)} aria-pressed={group.matchType === 'ALL'}
                    className="rounded px-2 py-0.5">All</Button>
                  <Button type="button" variant={group.matchType === 'ANY' ? 'primary' : 'ghost'} size="xs"
                    onClick={() => group.matchType === 'ALL' && toggleMatchType(group.id)} aria-pressed={group.matchType === 'ANY'}
                    className="rounded px-2 py-0.5">Any</Button>
                </div>
                {visibleGroups.length > 1 && (
                  <button type="button" onClick={() => removeGroup(group.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle transition-all hover:bg-danger-bg hover:text-danger">
                    <X size={13} />
                  </button>
                )}
              </div>
            );
            return (
              <div key={group.id} className={cn(gi > 0 && 'border-t border-border')}>
                {gi > 0 && (
                  <div className="flex items-center gap-2 px-3 pt-2">
                    <span className="text-label-sm font-semibold text-fg-muted">and</span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}

                {group.matchType === 'ALL' ? (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2 px-3">
                      <p className="text-label-sm font-semibold text-fg-muted">All of these conditions</p>
                      {groupControls}
                    </div>
                    {visibleRules.length === 0 ? (
                      <p className="px-3 py-3 text-caption italic text-fg-muted">No conditions yet — add a field below.</p>
                    ) : (
                      <div className="px-3">
                        {visibleRules.map(r => (
                          <RuleRow
                            key={r.id} rule={r}
                            onTypeChange={v  => onTypeChange(group.id, r.id, v)}
                            onOpChange={v    => updateRule(group.id, r.id, { operator: v })}
                            onValChange={v   => updateRule(group.id, r.id, { value: v })}
                            onMultiToggle={s => onMultiToggle(group.id, r.id, s)}
                            onGradeChange={v => updateRule(group.id, r.id, { gradeValue: v })}
                            onInstToggle={s  => updateRule(group.id, r.id, { institutions: toggleArr(r.institutions, s) })}
                            subjectOpts={subjectOpts}
                            onRemove={() => removeRule(group.id, r.id)}
                          />
                        ))}
                      </div>
                    )}
                    <div className="px-3 py-2">
                      <Button type="button" variant="ghost" size="xs" onClick={() => addRule(group.id)}>
                        <Plus size={13} />Add field
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-label-sm font-semibold text-fg-muted">Any one of these options</p>
                      {groupControls}
                    </div>
                    {(group.pathways ?? []).length === 0 ? (
                      <p className="py-2 text-caption italic text-fg-muted">No options yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(group.pathways ?? []).map((pathway, pi) => (
                          <div key={pathway.id}>
                            {pi > 0 && (
                              <div className="flex items-center gap-2 py-1">
                                <div className="h-px flex-1 bg-border/50" />
                                <span className="text-label-sm font-semibold text-fg-muted">or</span>
                                <div className="h-px flex-1 bg-border/50" />
                              </div>
                            )}
                            <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
                              <div className="flex items-center justify-between border-b border-border/60 bg-bg-subtle/40 px-3 py-1.5">
                                <p className="text-label-sm font-semibold text-fg-subtle">Option {pi + 1}</p>
                                <button type="button" onClick={() => removePathway(group.id, pathway.id)}
                                  className="flex h-5 w-5 items-center justify-center rounded-full text-fg-subtle transition-all hover:bg-danger-bg hover:text-danger">
                                  <X size={11} />
                                </button>
                              </div>
                              {pathway.rules.length > 0 && (
                                <div className="px-3">
                                  {pathway.rules.map(r => (
                                    <RuleRow
                                      key={r.id} rule={r}
                                      onTypeChange={v  => onPathwayTypeChange(group.id, pathway.id, r.id, v)}
                                      onOpChange={v    => updatePathwayRule(group.id, pathway.id, r.id, { operator: v })}
                                      onValChange={v   => updatePathwayRule(group.id, pathway.id, r.id, { value: v })}
                                      onMultiToggle={s => onPathwayMultiToggle(group.id, pathway.id, r.id, s)}
                                      onGradeChange={v => updatePathwayRule(group.id, pathway.id, r.id, { gradeValue: v })}
                                      onInstToggle={s  => updatePathwayRule(group.id, pathway.id, r.id, { institutions: toggleArr(r.institutions, s) })}
                                      subjectOpts={subjectOpts}
                                      onRemove={() => removePathwayRule(group.id, pathway.id, r.id)}
                                    />
                                  ))}
                                </div>
                              )}
                              <div className="border-t border-border/60 px-3 py-1.5">
                                <Button type="button" variant="ghost" size="xs" onClick={() => addPathwayRule(group.id, pathway.id)}>
                                  <Plus size={11} />Add condition
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <Button type="button" variant="ghost" size="xs" onClick={() => addPathway(group.id)}>
                        <Plus size={12} />Add option
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer — add another AND-group of conditions */}
          <div className="border-t border-border px-3 py-2.5">
            <Button type="button" variant="ghost" size="xs" onClick={addGroup}>
              <Plus size={14} />Add group
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Eligibility summary panel — plain-English criteria summary ───── */
function EligibilitySummaryPanel({ groups, onViewDetail }: { groups: CriteriaGroup[]; onViewDetail?: () => void }) {
  const sentences      = generateEligibilitySummary(groups);
  const isListFormat   = sentences.length > 1 && /^\d\./.test(sentences[1] ?? '');

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="px-4 py-3 space-y-2.5">
        {/* Prose summary — capped so a long criteria set scrolls within the panel
            rather than pushing the step off a short (13") screen. */}
        <div className="max-h-[40vh] max-w-[78ch] space-y-1 overflow-y-auto">
          {sentences.map((s, i) => (
            <p
              key={i}
              className={cn(
                'leading-relaxed',
                i === 0 && isListFormat
                  ? 'text-body-sm text-fg-muted'
                  : 'text-body-sm text-fg',
                isListFormat && i > 0 && 'font-medium',
              )}
            >
              {s}
            </p>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3">
          {groups.length > 0 && onViewDetail && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewDetail}
            >
              View Eligibility
            </Button>
          )}
          <span className={cn('badge inline-flex items-center gap-1 text-caption font-normal', AI_COLOURS.suggestButton)}>
            <AiSparkleIcon size={12} />
            Generated from configured criteria
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Review overview ────────────────────────────────────────────── */
function OverviewSection({
  title, year, description, category, intakes, groups, formTemplate, onPreviewApplicationForm, onPreviewCriteria,
  attachmentMap, onCancel,
}: {
  title: string; year: number; description: string; category: string[];
  intakes?: IntakeWindow[];
  groups: CriteriaGroup[]; formTemplate?: string;
  attachmentMap: Record<string, string[]>;
  onPreviewApplicationForm?: () => void;
  onPreviewCriteria?: () => void;
  onCancel?: () => void;
}) {
  const [activeIntake, setActiveIntake] = useState<number>(0);
  const criteriaCount = groups.reduce((total, group) => total + group.rules.length + group.pathways.reduce((n, pathway) => n + pathway.rules.length, 0), 0);
  const intakeSummaries = useMemo(() => {
    return (intakes ?? []).map((w, i) => {
      const intakeId = w.id as string | undefined;
      const assignedCount = intakeId ? (attachmentMap[intakeId] ?? []).length : 0;
      const internshipWindow = w.start && w.end ? `${isoToMMMYY(w.start)} – ${isoToMMMYY(w.end)}` : '— Not set';
      return {
        id: intakeId ?? `intake-${i}`,
        index: i,
        assignedCount,
        internshipWindow,
        title: `Intake ${i + 1}`,
      };
    });
  }, [attachmentMap, intakes, title]);

  return (
    <div className="space-y-5">
      {/* Programme Details */}
      <div className="overflow-hidden rounded-lg bg-surface">
        <div className="border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-body-md font-semibold text-fg">Programme Details</p>
              <p className="mt-0.5 text-caption text-fg-muted">Review the programme configuration before creating.</p>
            </div>
          </div>
        </div>

        <div className="py-5 space-y-5">
          {/* Row 1: core metadata */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:gap-0">
            <div className="lg:pr-4">
              <p className="text-caption text-fg-muted">Internship year</p>
              <p className="mt-1 text-body-sm font-medium text-fg">{year}</p>
            </div>
            <div className="hidden lg:block w-px bg-border" />
            <div className="lg:px-4">
              <p className="text-caption text-fg-muted">Intern category</p>
              <p className="mt-1 text-body-sm font-medium text-fg">
                {category.length > 0 ? category.join(', ') : '—'}
              </p>
            </div>
            <div className="hidden lg:block w-px bg-border" />
            <div className="lg:pl-4">
              <p className="text-caption text-fg-muted">Programme Title</p>
              <p className="mt-1 text-body-sm font-medium text-fg">{title || '—'}</p>
            </div>
          </div>

          {/* Row 2: Application Form + Eligibility Criteria */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Application Form preview */}
            <div className="rounded-lg border border-border bg-bg-subtle p-4">
              <label className="block text-body-sm font-semibold text-fg">Application Form</label>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-fg-muted">
                A read-only preview is generated from the selected intern category.
              </p>
              <div className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted px-3 py-3">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-fg">
                      {formTemplate || 'Not configured'}
                    </span>
                    <span className="block text-caption text-fg-muted">
                      {formTemplate ? 'View or edit application form.' : 'Select an intern category to load the default form.'}
                    </span>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!formTemplate}
                  onClick={onPreviewApplicationForm}
                >
                  <Eye size={14} />Preview Application Form
                </Button>
              </div>
            </div>

            {/* Eligibility Criteria */}
            <div className="rounded-lg border border-border bg-bg-subtle p-4">
              <label className="block text-body-sm font-semibold text-fg">Eligibility Criteria</label>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-fg-muted">
                Who can apply. Defaults based on education level, editable.
              </p>
              <div className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted px-3 py-3">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-fg">
                      {category.length === 0
                        ? 'Not configured'
                        : `${criteriaCount} ${criteriaCount === 1 ? 'criterion' : 'criteria'} configured`}
                    </span>
                    <span className="block text-caption text-fg-muted">
                      {category.length === 0
                        ? 'Select an intern category above to load criteria'
                        : 'View or edit eligibility criteria'}
                    </span>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={category.length === 0}
                  onClick={onPreviewCriteria}
                >
                  <Eye size={14} />Preview Criteria
                </Button>
              </div>
            </div>
          </div>

          {/* Row 3: Programme Description */}
          <div>
            <p className="text-caption text-fg-muted">Programme Description</p>
            <p className="mt-1 text-body-sm leading-relaxed text-fg">
              {description || '— Not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Intakes + Eligibility Requirements */}
      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-t-lg border-b border-border bg-surface shadow-lg lg:overflow-visible lg:rounded-b-none lg:rounded-l-lg lg:border-b-0 lg:border-r" aria-label="Intakes">
          <div className="flex min-w-0 flex-1 flex-col">
            {intakeSummaries.length === 0 ? (
              <p className="px-4 py-3 text-caption text-fg-muted">No intake windows configured.</p>
            ) : (
              intakeSummaries.map(summary => {
                const isActive = activeIntake === summary.index;
                return (
                  <div
                    key={summary.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveIntake(summary.index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveIntake(summary.index);
                      }
                    }}
                    className={cn(
                      'group relative box-border w-full min-w-0 cursor-pointer border-b px-4 py-3 transition-colors',
                      isActive ? 'z-10 border-border bg-bg-muted' : 'border-border bg-surface hover:bg-bg-subtle',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className={cn('min-w-0 text-left', isActive && 'pr-3')}>
                        <span className={cn('block truncate text-body-sm', isActive ? 'font-semibold text-fg' : 'font-medium text-fg')}>
                          {summary.title}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-fg-muted">
                          {summary.internshipWindow}
                        </span>
                      </div>
                      <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-caption font-medium text-fg-muted">
                        {summary.assignedCount} project{summary.assignedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {isActive && (
                      <span
                        className="absolute right-[-11px] top-1/2 z-10 h-full w-[11px] -translate-y-1/2 bg-[length:auto_100%] bg-right bg-no-repeat"
                        style={{ backgroundImage: 'url(/assets/request-arrow.svg)' }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className="min-w-0 rounded-b-lg p-5 lg:rounded-b-none lg:rounded-r-lg">
          <div className="mb-3">
            <p className="text-label-md font-semibold text-fg">Eligibility Requirements</p>
            <p className="mt-0.5 text-caption text-fg-muted">Generated from configured criteria</p>
          </div>
          <EligibilitySummaryPanel groups={groups} onViewDetail={onPreviewCriteria} />
        </section>
      </div>
    </div>
  );
}

/* ── Template preview modal ──────────────────────────────────────── */
function TemplatePreviewModal({ templateName, onClose }: { templateName: string; onClose: () => void }) {
  /* Try loading real fields from localStorage first */
  const liveFields = useMemo<FormField[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('dsta_app_form_templates');
      if (!raw) return null;
      const all: AppFormTemplate[] = JSON.parse(raw);
      const tpl = all.find(t => t.name === templateName);
      return tpl?.fields?.length ? tpl.fields : null;
    } catch { return null; }
  }, [templateName]);

  /* Group live fields by section */
  const liveSections = useMemo(() => {
    if (!liveFields) return null;
    const map: Record<string, FormField[]> = {};
    const order: string[] = [];
    for (const f of liveFields) {
      if (!map[f.section]) { map[f.section] = []; order.push(f.section); }
      map[f.section].push(f);
    }
    return order.map(s => ({ title: s, fields: map[s] }));
  }, [liveFields]);

  function FieldRow({ field }: { field: FormField }) {
    return (
      <div className="flex gap-4 items-start py-2 border-b border-border last:border-0">
        <span className="text-body-sm text-fg-muted min-w-[210px] leading-5 pt-px">
          {field.label}{field.required && <span className="text-danger ml-0.5">*</span>}
        </span>
        {field.type === 'textarea' ? (
          <div className="flex-1 flex flex-col gap-2.5 pt-1.5">
            <div className="border-b border-border-strong" /><div className="border-b border-border-strong" /><div className="border-b border-border-strong" />
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
    <Sheet open={true} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[720px] flex flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle className="text-headline-md text-fg">Application form preview</SheetTitle>
          <SheetDescription className="truncate text-body-sm">{templateName}</SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto bg-bg-muted p-6">
          {!liveSections || liveSections.length === 0 ? (
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
              <h1 className="text-headline-sm text-accent text-center mb-1">{templateName}</h1>
              <p className="text-caption text-fg-subtle text-center mb-8 uppercase tracking-widest">For Official Use Only</p>

              {liveSections.map(sec => (
                <div key={sec.title} className="mb-7">
                  <div className="bg-accent px-4 py-2 mb-3">
                    <p className="text-caption text-accent-fg font-semibold uppercase tracking-widest">{sec.title}</p>
                  </div>
                  <div>
                    {sec.fields.map(f => <FieldRow key={f.id} field={f} />)}
                  </div>
                </div>
              ))}

              <div className="mt-10 pt-4 border-t border-border">
                <p className="text-caption text-fg-subtle text-center">DSTA Talent Acquisition Portal — {templateName}</p>
              </div>
            </div>
          )}
        </SheetBody>
        <SheetFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ── Select wrapper ──────────────────────────────────────────────── */
function Sel({
  value, onChange, className = '', children,
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map(child => {
      const props = child.props as OptionHTMLAttributes<HTMLOptionElement>;
      return {
        value: String(props.value ?? ''),
        disabled: !!props.disabled,
        label: props.children,
      };
    });
  const placeholder = options.find(opt => opt.value === '')?.label;

  return (
    <Select
      value={value as string}
      onValueChange={next => onChange?.({ target: { value: next ?? '' } } as React.ChangeEvent<HTMLSelectElement>)}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options
          .filter(opt => opt.value !== '')
          .map(opt => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

/* ── Section divider — shared section-heading style across creation forms ── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-caption font-semibold text-fg-subtle uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

/* ── Stepper indicator ───────────────────────────────────────────── */
/* One concept per step — kept generic so the chip and the section header both read cleanly. */
const STEP_DEFS = [
  { n: 1, label: 'Programme Details' },
  { n: 2, label: 'Intakes & Projects' },
  { n: 3, label: 'Review & Create' },
];

function Stepper({ step, onStepClick }: { step: number; onStepClick: (n: number) => void }) {
  return (
    <div className="flex items-center">
      {STEP_DEFS.map((s, i) => {
        const visited = s.n <= step;
        return (
          <Fragment key={s.n}>
            <button
              type="button"
              disabled={!visited}
              onClick={() => visited && onStepClick(s.n)}
              className={cn(
                'flex items-center gap-2 shrink-0 rounded-lg px-1 py-0.5 transition-colors',
                visited ? 'cursor-pointer hover:bg-accent/5' : 'cursor-default'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
                step > s.n  ? 'bg-accent text-accent-fg' :
                step === s.n ? 'bg-accent text-accent-fg ring-2 ring-offset-1 ring-accent/30' :
                'bg-bg-muted text-fg-muted border border-border'
              )}>
                {step > s.n ? <Check size={12} /> : s.n}
              </div>
              <span className={cn(
                'text-xs font-semibold whitespace-nowrap transition-colors',
                step >= s.n ? 'text-accent' : 'text-fg-subtle'
              )}>
                {s.label}
              </span>
            </button>
            {i < STEP_DEFS.length - 1 && (
              <div className="flex-1 mx-4 h-px relative overflow-hidden rounded">
                <div className="absolute inset-0 bg-border" />
                <div
                  className="absolute inset-0 bg-accent transition-all duration-300"
                  style={{ width: step > s.n ? '100%' : '0%' }}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ── Default eligibility criteria per category ─────────────────────
   Preloads a starting set of criteria the moment an officer picks an intern category, so
   the common DSTA screening rules are in place and editable rather than blank:
     • Nationality — always Singapore by default.
     • Intern category + the academic cut-offs from the eligibility playbook.
   Categories that span several SG education systems (e.g. a JC applicant could be on
   A-Level, IB or NUS High) are preloaded as an "any of" group with one pathway per
   system, each carrying its own cut-off. Thresholds: A-Level/O-Level/IP STEM ≥ B,
   IB total ≥ 40, NUS High CAP ≥ 4.5, Polytechnic GPA ≥ 3.8, University CAP ≥ 4.0
   (NUS/NTU/SUTD) or ≥ 3.6 (SMU). */
function defaultReqs(categories: string[]): CriteriaGroup[] {
  if (categories.length === 0) return [];

  let seq = 0;
  const nid = () => ++seq;                  // unique id across groups, pathways and rules
  const has = (v: string) => categories.includes(v);

  // ── rule constructors ──────────────────────────────────────────
  const rCitizen = (): CriteriaRule => ({ id: nid(), type: 'citizenship', operator: 'is any of', value: ['Singapore'] });
  const rEdu  = (v: string): CriteriaRule => ({ id: nid(), type: 'education', operator: 'is', value: v });
  const rGpa  = (v: string, institutions?: string[]): CriteriaRule => ({ id: nid(), type: 'gpa', operator: 'at least', value: v, ...(institutions ? { institutions } : {}) });
  const rNum  = (type: string, v: string): CriteriaRule => ({ id: nid(), type, operator: 'at least', value: v });
  const rSubj = (type: string, subjects: string[], grade: string): CriteriaRule => ({ id: nid(), type, operator: 'with min grade', value: subjects, gradeValue: grade });

  // ── education-system pathways (each builds its own ids on call) ──
  const STEM_A  = ['Mathematics (H2)', 'Further Mathematics (H2)', 'Physics (H2)', 'Chemistry (H2)', 'Biology (H2)', 'Computing (H2)'];
  const STEM_O  = ['Mathematics', 'Additional Mathematics', 'Physics', 'Chemistry', 'Biology'];
  const pathALevel  = (): CriteriaPathway => ({ id: nid(), rules: [rEdu('Junior College'), rSubj('alevel_subject_grade', STEM_A, 'B')] });
  const pathIB      = (): CriteriaPathway => ({ id: nid(), rules: [rEdu('IB Diploma'), rNum('ib_score', '40')] });
  const pathNusHigh = (): CriteriaPathway => ({ id: nid(), rules: [rNum('nushigh_cap', '4.5')] });
  const pathPoly    = (): CriteriaPathway => ({ id: nid(), rules: [rEdu('Polytechnic'), rGpa('3.8')] });

  const groups: CriteriaGroup[] = [];

  // Group 1 — Nationality (Singapore Citizen by default) + an education-level rule that
  // matches the chosen internship category (JC → Junior College, Polytechnic →
  // Polytechnic, University → University, IP → Secondary School). University pins the
  // plain "University" level rather than a specific year so it doesn't over-restrict.
  // Post-JC/Post-Poly spans two levels, so its intern category lives in the pathways.
  const group1: CriteriaRule[] = [rCitizen()];

  if (has('Polytechnic Scholar/Polytechnic Student')) {
    group1.push(rEdu('Polytechnic'), rGpa('3.8'));
    groups.push({ id: nid(), matchType: 'ALL', rules: group1, pathways: [] });
  } else if (has('Undergraduate Scholar/Merit Scholar') || has('Tech UP') || has('Undergraduate Student')) {
    group1.push(rEdu('University'));
    groups.push({ id: nid(), matchType: 'ALL', rules: group1, pathways: [] });
    // CAP differs by institution → "any of" with one pathway per cut-off.
    groups.push({ id: nid(), matchType: 'ANY', rules: [], pathways: [
      { id: nid(), rules: [rGpa('4.0', ['NUS', 'NTU', 'SUTD'])] },
      { id: nid(), rules: [rGpa('3.6', ['SMU'])] },
    ] });
  } else if (has('Junior College Scholar/Junior College Student')) {
    group1.push(rEdu('Junior College'));
    groups.push({ id: nid(), matchType: 'ALL', rules: group1, pathways: [] });
    // Intern category is pinned above; pathways carry the academic cut-offs only.
    groups.push({ id: nid(), matchType: 'ANY', rules: [], pathways: [
      { id: nid(), rules: [rSubj('alevel_subject_grade', STEM_A, 'B')] },
      { id: nid(), rules: [rNum('ib_score', '40')] },
      { id: nid(), rules: [rNum('nushigh_cap', '4.5')] },
    ] });
  } else if (has('Post Junior College/Post Polytechnic Student')) {
    groups.push({ id: nid(), matchType: 'ALL', rules: group1, pathways: [] });
    // Spans JC and Poly → each pathway carries its own intern category + cut-off.
    groups.push({ id: nid(), matchType: 'ANY', rules: [], pathways: [pathALevel(), pathIB(), pathNusHigh(), pathPoly()] });
  } else if (has('Young Defence Scientist Programme')) {
    group1.push(rEdu('Secondary School'));
    groups.push({ id: nid(), matchType: 'ALL', rules: group1, pathways: [] });
    // IP draws from secondary students — O-Level or IP, STEM subjects ≥ B.
    groups.push({ id: nid(), matchType: 'ANY', rules: [], pathways: [
      { id: nid(), rules: [rSubj('olevel_subject_grade', STEM_O, 'B3')] },
      { id: nid(), rules: [rSubj('ip_subject_grade', STEM_O, 'B3')] },
    ] });
  } else {
    groups.push({ id: nid(), matchType: 'ALL', rules: group1, pathways: [] });
  }

  return groups;
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ProgrammeFormPage() {
  const router = useRouter();

  const [isEdit, setIsEdit]             = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [step, setStep]                 = useState(1);

  const [cpTitle, setCpTitle]           = useState('');
  const [cpCategory, setCpCategory]     = useState<string[]>([]);
  const [cpStatus, setCpStatus]         = useState<ProgStatus>('Active');
  const [cpIntakes, setCpIntakes] = useState<IntakeWindow[]>([{ id: newIntakeId(), appOpen: '', appClose: '', start: '', end: '' }]);
  // Calendar year the seeded internship windows are anchored to. Picking a category
  // seeds each intake's window shifted to this year; changing it shifts them all.
  const [cpIntakeYear, setCpIntakeYear] = useState<number>(DEFAULT_INTAKE_YEAR);
  const [cpDescription, setCpDescription] = useState('');
  const [cpReqs, setCpReqs]             = useState<CriteriaGroup[]>([]);
  // Eligibility criteria are preloaded from the chosen intern category and shown as a
  // plain-English summary in Programme Details. A single drawer handles both the detailed
  // read view ('view') and the criteria builder ('edit'); null = closed.
  const [reqsDrawer, setReqsDrawer]     = useState<null | 'view' | 'edit'>(null);
  // Projects attached to this programme on the new Attach-Projects step. Approved projects
  // are submitted unassigned (no programme) and tagged by Intern Category; here the IO picks
  // approved unassigned projects of the programme's Intern Category to attach.
  // Per-intake attachment map: intakeId → attached project ids. A project may appear under
  // several intakes (shared pool). Auto-allocated by period-fit when the pool/intakes load;
  // the IO then prunes exceptions and places the period-mismatches.
  const [cpAttach, setCpAttach] = useState<Record<string, string[]>>({});
  const [cpPlacement, setCpPlacement] = useState<Record<string, Record<string, number>>>({});
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [assignDialog, setAssignDialog] = useState<{ projectIds: string[]; mode: 'single' | 'batch' } | null>(null);
  const [assignDraftIntakes, setAssignDraftIntakes] = useState<string[]>([]);
  const [assignDraftPlacements, setAssignDraftPlacements] = useState<Record<string, number>>({});
  const [batchAssignMode, setBatchAssignMode] = useState<'add' | 'replace'>('add');
  const [openIntakeId, setOpenIntakeId] = useState<string | null>(null);
  const [isPendingIntakeTransition, startIntakeTransition] = useTransition();
  const selectIntake = (id: string | null) => {
    startIntakeTransition(() => {
      setOpenIntakeId(id);
    });
  };
  const [assignFilter, setAssignFilter] = useState<'assigned' | 'unassigned'>('assigned');
  // Edit-mode auto-allocation: a one-time initial fill, plus tracking of which intakes
  // have been auto-allocated so a NEWLY-added intake gets filled without disturbing the
  // existing ones.
  const didEditInitAllocRef = useRef(false);
  const knownIntakeIdsRef = useRef<Set<string>>(new Set());
  // Inline period editor for a needs-attention project: fix its internship window
  // here (persisted to the project) so it can auto-allocate without leaving the wizard.
  const [periodEdit, setPeriodEdit] = useState<{ projectId: string; title: string; start: string; end: string } | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectEntry[]>([]);
  // The intern category the preloaded criteria were generated for, so switching
  // levels reloads that level's defaults (see the step-1 effect below).
  const [defaultReqsCat,  setDefaultReqsCat]  = useState('');
  const [cpErrors, setCpErrors]         = useState<Record<string, string>>({});
  // TOA-007: original criteria snapshot + re-screen opt-in (eligibility edited after
  // applications were already screened against the previous rules).
  const [origReqs, setOrigReqs]         = useState('');
  const [rescreenAffected, setRescreenAffected] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const { setDirty, safeNavigate } = useUnsavedChanges();
  const sysCfg = useSystemConfig();

  // Step 2 derived values (kept at top level so they can use hooks without being inside the
  // conditional step-2 IIFE, which would break hook-order rules).
  const selectedIntake = useMemo(() => cpIntakes.find(w => w.id === openIntakeId) ?? cpIntakes[0], [cpIntakes, openIntakeId]);
  const selectedIntakeId = selectedIntake?.id as string | undefined;
  const selectedIndex = useMemo(() => Math.max(0, cpIntakes.findIndex(w => w.id === selectedIntake?.id)), [cpIntakes, selectedIntake]);
  const assignedToIntake = useMemo(() => selectedIntakeId ? new Set(cpAttach[selectedIntakeId] ?? []) : new Set<string>(), [selectedIntakeId, cpAttach]);
  const assignedProjects = useMemo(() => availableProjects.filter(p => assignedToIntake.has(p.id)), [availableProjects, assignedToIntake]);
  const notAssignedProjects = useMemo(() => availableProjects.filter(p => !assignedToIntake.has(p.id)), [availableProjects, assignedToIntake]);
  const visibleProjects = useMemo(() => assignFilter === 'assigned' ? assignedProjects : notAssignedProjects, [assignFilter, assignedProjects, notAssignedProjects]);

  /* Map each category to its applicant-facing application form (intern forms; scholar
     variants excluded for now). Mirrors the applicant-side resolution in apply-form.tsx
     so the preview shows the exact form a candidate will fill. There is no dedicated
     Polytechnic intern form, so it shares the Post-JC/Post-Poly form. */
  const CATEGORY_FORM_MAP: Record<string, string> = {
    'Undergraduate Scholar/Merit Scholar':            'UG Intern Application Form',
    'Tech UP':                                        'UG Intern Application Form',
    'Undergraduate Student':                          'UG Intern Application Form',
    'Junior College Scholar/Junior College Student':  'JC Intern Application Form',
    'Polytechnic Scholar/Polytechnic Student':        'Post-JC/Post-Poly Application Form',
    'Post Junior College/Post Polytechnic Student':   'Post-JC/Post-Poly Application Form',
    'Young Defence Scientist Programme':              'IP Application Form',
  };

  /* The Intern Category checkboxes. Each option carries the raw category value(s)
     it sets and resolves to one application form. */
  const CATEGORY_OPTIONS: { label: string; values: string[] }[] = [
    { label: 'Undergraduate Scholar/Merit Scholar',            values: ['Undergraduate Scholar/Merit Scholar'] },
    { label: 'Tech UP',                                        values: ['Tech UP'] },
    { label: 'Undergraduate Student',                          values: ['Undergraduate Student'] },
    { label: 'Junior College Scholar/Junior College Student', values: ['Junior College Scholar/Junior College Student'] },
    { label: 'Polytechnic Scholar/Polytechnic Student',       values: ['Polytechnic Scholar/Polytechnic Student'] },
    { label: 'Post Junior College/Post Polytechnic Student',  values: ['Post Junior College/Post Polytechnic Student'] },
    { label: 'Young Defence Scientist Programme',             values: ['Young Defence Scientist Programme'] },
  ];
  /* The application form an option maps to (all of an option's values share one form). */
  const templateForOption = (values: string[]): string => CATEGORY_FORM_MAP[values[0]] ?? '';

  /* Returns ordered unique form names for the selected categories */
  function derivedTemplatesForCategories(cats: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const cat of cats) {
      const name = CATEGORY_FORM_MAP[cat];
      if (name && !seen.has(name)) { seen.add(name); out.push(name); }
    }
    return out;
  }
  const derivedTemplates = derivedTemplatesForCategories(cpCategory);
  const derivedTemplate  = derivedTemplates[0] ?? '';
  /* Thumbnail mode: each unique form paired with the ticked category labels it covers. */
  const previewCards = derivedTemplates.map(name => ({
    name,
    categories: CATEGORY_OPTIONS
      .filter(o => o.values.every(v => cpCategory.includes(v)) && templateForOption(o.values) === name)
      .map(o => o.label),
  }));

  /* Intern Category is single-select. The currently-chosen option is the one whose
     values exactly match cpCategory; fall back to the first partial match so legacy
     multi-category programmes still resolve to a sensible selection in edit mode. */
  const selectedCategoryOption =
    CATEGORY_OPTIONS.find(o => o.values.length === cpCategory.length && o.values.every(v => cpCategory.includes(v)))
    ?? CATEGORY_OPTIONS.find(o => o.values.every(v => cpCategory.includes(v)))
    ?? null;
  function selectCategory(values: string[]) {
    setCpCategory(values);
    if (cpErrors.category) setCpErrors(p => ({ ...p, category: '' }));
    // Seed the intakes from the category's internship-window presets, so the officer
    // reaches step 2 with the right number of intakes and their windows already chosen
    // (the application window is still theirs to set). Skip in edit mode so a saved
    // programme's configured intakes are never clobbered.
    if (!isEdit) {
      const presets = CATEGORY_INTAKE_PRESETS[values[0]];
      const dy = cpIntakeYear - INTAKE_BASE_YEAR; // shift presets to the chosen intake year
      const seeded: IntakeWindow[] = (presets?.length ? presets : [{ start: '', end: '' }]).map(p => ({
        id: newIntakeId(),
        appOpen: '',
        appClose: '',
        start: p.start ? mmmyyToISO(shiftMMMYY(p.start, dy)) : '',
        end: p.end ? mmmyyToISOEnd(shiftMMMYY(p.end, dy)) : '',
      }));
      setCpIntakes(seeded);
      setOpenIntakeId(seeded[0]?.id ?? null);
    }
  }

  // Change the intake year: shift every already-set intake window forward/back by the
  // delta, so the seeded (and any manually-picked) windows move to the new cycle.
  function changeIntakeYear(nextYear: number) {
    const dy = nextYear - cpIntakeYear;
    setCpIntakeYear(nextYear);
    if (dy === 0) return;
    setCpIntakes(prev => prev.map(w => {
      const s = isoToMMMYY(w.start), e = isoToMMMYY(w.end);
      return {
        ...w,
        start: s ? mmmyyToISO(shiftMMMYY(s, dy)) : w.start,
        end: e ? mmmyyToISOEnd(shiftMMMYY(e, dy)) : w.end,
      };
    }));
  }

  useEffect(() => {
    const seed = appFormSeed as AppFormTemplate[];
    const savedVer = localStorage.getItem(AFT_VER_KEY);
    if (savedVer !== AFT_SEED_VER) {
      localStorage.setItem(AFT_KEY, JSON.stringify(seed));
      localStorage.setItem(AFT_VER_KEY, AFT_SEED_VER);
    } else {
      const raw = localStorage.getItem(AFT_KEY);
      if (!raw) localStorage.setItem(AFT_KEY, JSON.stringify(seed));
    }

    const pending = localStorage.getItem('dsta_edit_pending');
    if (pending) {
      localStorage.removeItem('dsta_edit_pending');
      const prog = loadProgrammes().find(p => p.id === pending);
      if (prog) {
        setIsEdit(true);
        setEditingId(prog.id);
        setCpTitle(prog.title);
        setCpCategory(prog.educationLevel ? [prog.educationLevel] : []);
        setCpStatus(prog.status === 'Draft' ? 'Active' : prog.status);
        const loadedIntakes = withIntakeIds(
          prog.intakeWindows?.length
            ? prog.intakeWindows
            : [{ appOpen: prog.appOpen ?? '', appClose: prog.appDeadline ?? '', start: prog.start ?? '', end: prog.end ?? '' }]
        );
        setCpIntakes(loadedIntakes);
        // Anchor the year selector to the saved intakes so year-shifts stay relative.
        const firstStart = loadedIntakes.find(w => w.start)?.start;
        const loadedYear = firstStart ? Math.floor((monthIndexFromISO(firstStart) ?? 0) / 12) : 0;
        if (loadedYear) setCpIntakeYear(loadedYear);
        setCpDescription(prog.description ?? '');
        setCpReqs(JSON.parse(JSON.stringify(prog.requirements ?? [])));
        setOrigReqs(JSON.stringify(prog.requirements ?? []));
        // Pre-fill the per-intake attachment map from the existing join (falling back to the
        // legacy programme/intakeId fields) so existing attachments can be kept or detached.
        try {
          const grouped: Record<string, string[]> = {};
          const placements: Record<string, Record<string, number>> = {};
          const rows = loadAttachments().filter(a => a.programmeId === prog.id);
          if (rows.length) {
            for (const a of rows) {
              (grouped[a.intakeId] ??= []).push(a.projectId);
              (placements[a.intakeId] ??= {})[a.projectId] = Math.max(1, a.placements ?? 1);
            }
          } else {
            for (const p of loadProjects().filter(p => p.programme === prog.id && p.intakeId)) {
              (grouped[p.intakeId as string] ??= []).push(p.id);
              (placements[p.intakeId as string] ??= {})[p.id] = 1;
            }
          }
          setCpAttach(grouped);
          setCpPlacement(placements);
        } catch { /* ignore */ }
      }
    }
  }, []);

  const isDirty = isEdit || !!(cpTitle || cpCategory.length > 0 || cpIntakes.some(w => w.appOpen || w.appClose || w.start || w.end) || cpDescription || cpReqs.length > 0);
  useEffect(() => { setDirty(isDirty); }, [isDirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  // The programme's Intern Category (drives which approved projects can be attached).
  const cpLevel = cpCategory[0] ? toEducationLevel(cpCategory[0]) : '';

  // Total criteria configured (rules across groups + their pathways) — used for the
  // compact eligibility row on the Details step.
  const eligCount = cpReqs.reduce(
    (acc, g) => acc + (g.rules?.length ?? 0) + (g.pathways ?? []).reduce((m, p) => m + p.rules.length, 0),
    0,
  );

  // Intakes that have usable (parseable) dates — only these can host a project.
  const datedIntakes = cpIntakes.filter(w => monthIndexFromISO(w.start) !== null && monthIndexFromISO(w.end) !== null);
  const intakesKey = cpIntakes.map(w => `${w.id}:${w.start}:${w.end}`).join('|');
  const canReviewIntakes = cpIntakes.length > 0 && cpIntakes.every(w => !!(w.appOpen && w.appClose && w.start && w.end));
  const assignSheetProject = assignDialog?.mode === 'single'
    ? availableProjects.find(p => p.id === assignDialog.projectIds[0])
    : null;
  const assignDraftPlacementTotal = assignDraftIntakes.reduce(
    (sum, intakeId) => sum + (assignDraftPlacements[intakeId] ?? 1),
    0,
  );
  const assignOverCapacity = !!assignSheetProject && assignDraftPlacementTotal > assignSheetProject.slots;

  // Load the pool (HARD gate: approved + level match + placements free) and AUTO-ALLOCATE
  // each project to every intake its period fits. Projects that fit no intake (period
  // mismatch or absent) are left unallocated → they surface in the "needs attention" bucket.
  // Re-runs when the level or intake dates change (those are the allocation inputs).
  useEffect(() => {
    if (!cpLevel) { setAvailableProjects([]); if (!isEdit) setCpAttach({}); return; }
    const all = loadProjects();
    const extraIds = isEdit ? all.filter(p => p.programme === editingId).map(p => p.id) : [];
    const avail = poolFor({ educationLevel: cpLevel as EducationLevel }, all, extraIds);
    setAvailableProjects(avail);
    // Edit mode: keep the IO's saved attachments; auto-allocation is additive only.
    if (isEdit) {
      // Initial fill (once): top up EXISTING intakes with fitting projects that aren't
      // attached anywhere yet, and record every current intake as "known".
      if (!didEditInitAllocRef.current && datedIntakes.length > 0) {
        didEditInitAllocRef.current = true;
        for (const w of datedIntakes) if (w.id) knownIntakeIdsRef.current.add(w.id as string);
        setCpAttach(prev => {
          const attachedAnywhere = new Set(Object.values(prev).flat());
          const next = { ...prev };
          for (const p of avail) {
            if (attachedAnywhere.has(p.id)) continue;
            for (const w of datedIntakes) if (fitsIntake(p, w)) {
              const wid = w.id as string;
              if (!(next[wid] ?? []).includes(p.id)) next[wid] = [...(next[wid] ?? []), p.id];
            }
          }
          return next;
        });
        return;
      }
      // A NEW intake was added: auto-assign EVERY fitting pool project to it (a project can
      // sit in several intakes). Existing intakes are untouched, so manual picks are kept.
      const newIntakes = datedIntakes.filter(w => w.id && !knownIntakeIdsRef.current.has(w.id as string));
      if (newIntakes.length > 0) {
        for (const w of newIntakes) knownIntakeIdsRef.current.add(w.id as string);
        setCpAttach(prev => {
          const next = { ...prev };
          for (const w of newIntakes) {
            const wid = w.id as string;
            for (const p of avail) if (fitsIntake(p, w) && !(next[wid] ?? []).includes(p.id)) {
              next[wid] = [...(next[wid] ?? []), p.id];
            }
          }
          return next;
        });
        setCpPlacement(prev => {
          const next = { ...prev };
          for (const w of newIntakes) {
            const wid = w.id as string;
            for (const p of avail) if (fitsIntake(p, w)) {
              next[wid] = { ...(next[wid] ?? {}), [p.id]: next[wid]?.[p.id] ?? 1 };
            }
          }
          return next;
        });
      }
      return;
    }
    // Create mode: auto-allocate each project to every intake its period fits.
    const next: Record<string, string[]> = {};
    const placementNext: Record<string, Record<string, number>> = {};
    for (const w of datedIntakes) next[w.id as string] = [];
    for (const p of avail) {
      for (const w of datedIntakes) if (fitsIntake(p, w)) {
        const intakeId = w.id as string;
        next[intakeId].push(p.id);
        (placementNext[intakeId] ??= {})[p.id] = 1;
      }
    }
    setCpAttach(next);
    setCpPlacement(placementNext);
  }, [cpLevel, intakesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const live = new Set(availableProjects.map(p => p.id));
    setSelectedProjectIds(prev => prev.filter(id => live.has(id)));
  }, [availableProjects]);

  // Derived: which pool projects are allocated to at least one intake, and which aren't.
  const allocatedIds = useMemo(() => new Set(Object.values(cpAttach).flat()), [cpAttach]);
  const needsAttention = availableProjects.filter(p => !allocatedIds.has(p.id));
  const attachTotal = allocatedIds.size;
  const attachPairTotal = Object.values(cpAttach).reduce((n, ids) => n + ids.length, 0);
  const allPoolSelected = availableProjects.length > 0 && selectedProjectIds.length === availableProjects.length;

  const toggleAttach = useCallback((intakeId: string, projectId: string) => {
    setCpAttach(prev => {
      const cur = prev[intakeId] ?? [];
      const nextList = cur.includes(projectId) ? cur.filter(id => id !== projectId) : [...cur, projectId];
      return { ...prev, [intakeId]: nextList };
    });
    setCpPlacement(prev => {
      const row = { ...(prev[intakeId] ?? {}) };
      if (row[projectId]) delete row[projectId];
      else row[projectId] = 1;
      return { ...prev, [intakeId]: row };
    });
  }, []);

  useEffect(() => {
    if (step !== 2) return;
    const firstId = cpIntakes[0]?.id as string | undefined;
    if (!firstId) {
      setOpenIntakeId(null);
      return;
    }
    if (!openIntakeId || !cpIntakes.some(w => w.id === openIntakeId)) {
      setOpenIntakeId(firstId);
    }
  }, [cpIntakes, openIntakeId, step]);

  function addIntake() {
    const id = newIntakeId();
    setCpIntakes(prev => [...prev, { id, appOpen: '', appClose: '', start: '', end: '' }]);
    setOpenIntakeId(id);
  }

  function removeIntake(index: number) {
    const removedId = cpIntakes[index]?.id as string | undefined;
    const fallbackId = (cpIntakes[index + 1]?.id ?? cpIntakes[index - 1]?.id ?? cpIntakes[0]?.id) as string | undefined;
    setCpIntakes(prev => prev.filter((_, j) => j !== index));
    if (removedId) {
      setCpAttach(prev => {
        const next = { ...prev };
        delete next[removedId];
        return next;
      });
      setCpPlacement(prev => {
        const next = { ...prev };
        delete next[removedId];
        return next;
      });
    }
    setOpenIntakeId(fallbackId && fallbackId !== removedId ? fallbackId : null);
  }

  const intakeIdsForProject = useCallback((projectId: string): string[] => {
    return datedIntakes
      .map(w => w.id as string)
      .filter(intakeId => (cpAttach[intakeId] ?? []).includes(projectId));
  }, [datedIntakes, cpAttach]);

  // Why a pool project is in the "needs attention" bucket — shown as a tooltip.
  function attentionReason(p: ProjectEntry): string {
    if (!hasPeriod(p)) return 'No internship window set on this project — set one so it can be matched to an intake.';
    const fitsAny = datedIntakes.some(w => periodsOverlap(w.start, w.end, p.internshipPeriodStart, p.internshipPeriodEnd));
    if (!fitsAny) return `No intake overlaps this project's hosting window (${p.internshipPeriodStart}–${p.internshipPeriodEnd}) — edit the period or attach it manually.`;
    return 'Not assigned to any intake yet.';
  }

  // The intake whose window the project's period is closest to (fewest months
  // outside on either side). Used by "Attach anyway" to pick a sensible target.
  function nearestIntake(p: ProjectEntry): IntakeWindow | null {
    if (datedIntakes.length === 0) return null;
    const ps = parseMMMYY(p.internshipPeriodStart), pe = parseMMMYY(p.internshipPeriodEnd);
    if (ps === null || pe === null) return datedIntakes[0];
    let best = datedIntakes[0], bestScore = Infinity;
    for (const w of datedIntakes) {
      const is = monthIndexFromISO(w.start), ie = monthIndexFromISO(w.end);
      if (is === null || ie === null) continue;
      const score = Math.max(0, is - ps) + Math.max(0, pe - ie);
      if (score < bestScore) { bestScore = score; best = w; }
    }
    return best;
  }

  // Attach a needs-attention project to its nearest intake despite the mismatch.
  function attachAnyway(p: ProjectEntry) {
    const w = nearestIntake(p);
    if (w?.id) toggleAttach(w.id, p.id); // not currently attached → this adds it
  }

  const openPeriodEdit = useCallback((p: ProjectEntry) => {
    setPeriodEdit({ projectId: p.id, title: p.title, start: isoDay(p.internshipPeriodStart, false), end: isoDay(p.internshipPeriodEnd, true) });
  }, []);

  // Persist the edited period to the project, refresh the local pool, and auto-attach
  // it to every intake it now fits — so fixing the period immediately clears the flag.
  function savePeriodEdit() {
    if (!periodEdit) return;
    const { projectId, start, end } = periodEdit;
    const patch = { internshipPeriodStart: start || undefined, internshipPeriodEnd: end || undefined };
    saveProjects(loadProjects().map(x => x.id === projectId ? { ...x, ...patch } : x));
    setAvailableProjects(prev => prev.map(x => x.id === projectId ? { ...x, ...patch } : x));
    setCpAttach(prev => {
      const updated = { ...prev };
      for (const w of datedIntakes) {
        const wid = w.id as string;
        const list = updated[wid] ?? [];
        const fits = !!start && !!end && periodsOverlap(w.start, w.end, start, end);
        if (fits && !list.includes(projectId)) updated[wid] = [...list, projectId];
      }
      return updated;
    });
    setCpPlacement(prev => {
      const updated = { ...prev };
      for (const w of datedIntakes) {
        const wid = w.id as string;
        const fits = !!start && !!end && periodsOverlap(w.start, w.end, start, end);
        if (fits) updated[wid] = { ...(updated[wid] ?? {}), [projectId]: updated[wid]?.[projectId] ?? 1 };
      }
      return updated;
    });
    setPeriodEdit(null);
  }

  function setProjectSelected(projectId: string, checked: boolean) {
    setSelectedProjectIds(prev => checked ? Array.from(new Set([...prev, projectId])) : prev.filter(id => id !== projectId));
  }

  function setAllProjectsSelected(checked: boolean) {
    setSelectedProjectIds(checked ? availableProjects.map(p => p.id) : []);
  }

  const openSingleAssign = useCallback((projectId: string, preferredIntakeId?: string) => {
    setAssignDialog({ projectIds: [projectId], mode: 'single' });
    const intakeIds = Array.from(new Set([
      ...intakeIdsForProject(projectId),
      ...(preferredIntakeId ? [preferredIntakeId] : []),
    ]));
    setAssignDraftIntakes(intakeIds);
    setAssignDraftPlacements(Object.fromEntries(
      intakeIds.map(intakeId => [intakeId, cpPlacement[intakeId]?.[projectId] ?? 1]),
    ));
    setBatchAssignMode('replace');
  }, [cpPlacement, intakeIdsForProject]);

  function openBatchAssign() {
    if (selectedProjectIds.length === 0) return;
    setAssignDialog({ projectIds: selectedProjectIds, mode: 'batch' });
    setAssignDraftIntakes([]);
    setAssignDraftPlacements({});
    setBatchAssignMode('add');
  }

  function toggleDraftIntake(intakeId: string) {
    setAssignDraftIntakes(prev => prev.includes(intakeId) ? prev.filter(id => id !== intakeId) : [...prev, intakeId]);
    setAssignDraftPlacements(prev => {
      if (intakeId in prev) {
        const next = { ...prev };
        delete next[intakeId];
        return next;
      }
      return { ...prev, [intakeId]: 1 };
    });
  }

  function setDraftPlacement(intakeId: string, value: string, max: number) {
    const parsed = Number.parseInt(value, 10);
    const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), Math.max(1, max)) : 1;
    setAssignDraftPlacements(prev => ({ ...prev, [intakeId]: next }));
  }

  function applyAssignmentDialog() {
    if (!assignDialog) return;
    const draft = new Set(assignDraftIntakes);
    const mode = assignDialog.mode === 'single' ? 'replace' : batchAssignMode;
    const projectIds = assignDialog.projectIds;

    setCpAttach(prev => {
      const next: Record<string, string[]> = {};
      for (const w of cpIntakes) {
        if (!w.id) continue;
        const intakeId = w.id as string;
        const existing = prev[intakeId] ?? [];
        const withoutTargets = mode === 'replace'
          ? existing.filter(id => !projectIds.includes(id))
          : existing;
        const additions = draft.has(intakeId) ? projectIds : [];
        next[intakeId] = Array.from(new Set([...withoutTargets, ...additions]));
      }
      return { ...prev, ...next };
    });
    setCpPlacement(prev => {
      const next: Record<string, Record<string, number>> = {};
      for (const w of cpIntakes) {
        if (!w.id) continue;
        const intakeId = w.id as string;
        const existing = { ...(prev[intakeId] ?? {}) };
        if (mode === 'replace') {
          for (const id of projectIds) delete existing[id];
        }
        if (draft.has(intakeId)) {
          for (const id of projectIds) existing[id] = assignDraftPlacements[intakeId] ?? 1;
        }
        next[intakeId] = existing;
      }
      return { ...prev, ...next };
    });

    setAssignDialog(null);
    setAssignDraftIntakes([]);
    setAssignDraftPlacements({});
    if (assignDialog.mode === 'batch') setSelectedProjectIds([]);
  }

  // Eligibility criteria are level-specific, so each intern category loads its own
  // defaults. Switching to a different level resets the criteria to that level's
  // defaults rather than carrying the previous level's edits across — otherwise a
  // change made for one level would bleed into every other level. Edit mode keeps
  // the programme's saved criteria untouched.
  useEffect(() => {
    if (isEdit) return;
    const catKey = cpCategory.join('|');
    if (catKey === defaultReqsCat) return; // same level — keep any edits made for it
    setCpReqs(defaultReqs(cpCategory));
    setDefaultReqsCat(catKey);
  }, [cpCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToIntakes() {
    const result = programmeStep1Schema.safeParse({
      title: cpTitle,
      category: cpCategory,
    });
    if (!result.success) {
      setCpErrors(flattenErrors(result));
      return;
    }
    setCpErrors({}); setStep(2);
  }

  // Set Up Intakes & Assign Projects is step 2 → validate intake fields before Review (3).
  function goToAttach() {
    const result = programmeStep2Schema(isEdit, sgToday()).safeParse({
      intakes: cpIntakes,
    });
    if (!result.success) {
      setCpErrors(formatIntakeErrors(result));
      return;
    }
    setCpErrors({}); setStep(3);
  }

  // TOA-007 — applications already screened against the *previous* criteria. Only the
  // pure screening outcomes (Pending Review / Auto-rejected) are eligible to re-screen;
  // anyone already shortlisted or further along is left untouched.
  const reqsChanged = isEdit && JSON.stringify(cpReqs) !== origReqs;
  function screenedAgainstOldCriteria(): Application[] {
    if (!isEdit || !editingId) return [];
    try {
      const apps = JSON.parse(localStorage.getItem('dsta_applications') || '[]') as Application[];
      return apps.filter(a => a.programmeId === editingId
        && (a.status === 'Pending Review' || a.status === 'Auto-rejected'));
    } catch { return []; }
  }
  // Reset the affected applications to Pending Screening so the next load re-evaluates
  // them against the updated criteria. Returns how many were queued.
  function requeueForScreening(): number {
    try {
      const apps = JSON.parse(localStorage.getItem('dsta_applications') || '[]') as Application[];
      let n = 0;
      const next = apps.map(a => {
        if (a.programmeId === editingId && (a.status === 'Pending Review' || a.status === 'Auto-rejected')) {
          n++;
          return { ...a, status: 'Pending Screening' as ApplicationStatus, eligibilityPass: false, failedCriteria: [] };
        }
        return a;
      });
      if (n) localStorage.setItem('dsta_applications', JSON.stringify(next));
      return n;
    } catch { return 0; }
  }

  // Attach the chosen pooled projects to this programme's intakes via the
  // ProjectAttachment join (the future-state source of truth), and DUAL-WRITE the
  // legacy ProjectEntry.programme/intakeId so the ~42 existing read-sites keep
  // working until they migrate onto the join. Any project previously attached to
  // THIS programme that was deselected is detached from both.
  function attachSelectedProjects(progId: string) {
    if (attachTotal === 0 && !isEdit) return;

    // 1) Join: replace all of this programme's rows with the per-intake map. One row per
    //    (project, intake) pair — a project may legitimately appear under several intakes.
    const others = loadAttachments().filter(a => a.programmeId !== progId);
    const mine: ProjectAttachment[] = [];
    for (const [intakeId, ids] of Object.entries(cpAttach)) {
      for (const projectId of ids) {
        // No per-intake placement split — a project's intern spots are a shared pool
        // across the intakes it's attached to, filled first-come.
        mine.push({ projectId, intakeId, programmeId: progId });
      }
    }
    saveAttachments([...others, ...mine]);

    // 2) Legacy dual-write (transition only). The legacy fields are single-valued, so a
    //    project attached to several intakes records just its FIRST intake here.
    const firstIntakeOf: Record<string, string> = {};
    for (const [intakeId, ids] of Object.entries(cpAttach)) {
      for (const id of ids) if (!(id in firstIntakeOf)) firstIntakeOf[id] = intakeId;
    }
    const all = loadProjects();
    const next = all.map(p => {
      if (p.id in firstIntakeOf)   return { ...p, programme: progId, intakeId: firstIntakeOf[p.id] };
      if (p.programme === progId)  return { ...p, programme: '', intakeId: undefined };  // detached
      return p;
    });
    saveProjects(next);
  }

  function submitWizard() {
    const progs    = loadProgrammes();
    const title    = cpTitle.trim();
    const firstIntake = cpIntakes[0] ?? { appOpen: '', appClose: '', start: '', end: '' };
    const timeline = firstIntake.start && firstIntake.end ? formatTimeline(firstIntake.start, firstIntake.end) : '—';
    const daysLeft = firstIntake.end ? calcDaysLeft(firstIntake.end) : 0;
    const reqs     = JSON.parse(JSON.stringify(cpReqs));
    // Auto-populate each intake's title from the programme name + its period.
    const titledIntakes = cpIntakes.map(w => ({ ...w, intakeTitle: intakeTitleFor(title, w) }));

    setDirty(false);
    if (isEdit && editingId) {
      const updated = { ...progs.find(p => p.id === editingId)!, title, educationLevel: toEducationLevel(cpCategory[0] ?? 'Undergraduate Student'), status: cpStatus, appOpen: firstIntake.appOpen, appDeadline: firstIntake.appClose, start: firstIntake.start, end: firstIntake.end, timeline, daysLeft, description: cpDescription, formTemplate: derivedTemplate, requirements: reqs, intakeWindows: titledIntakes };
      saveProgs(progs.map(p => p.id === editingId ? updated : p));
      attachSelectedProjects(editingId);
      localStorage.setItem('dsta_programme_view', JSON.stringify(updated));
      const requeued = (reqsChanged && rescreenAffected) ? requeueForScreening() : 0;
      sessionStorage.setItem('dsta_pending_toast', requeued
        ? `Programme updated. ${requeued} application${requeued !== 1 ? 's' : ''} queued for re-screening against the new criteria.`
        : 'Programme updated successfully.');
      router.push(`/programmes/${editingId}`);
    } else {
      const newProg: Programme = {
        id: generateProgId(progs.map(p => p.id)),
        title, educationLevel: toEducationLevel(cpCategory[0] ?? 'Undergraduate Student'), status: 'Active',
        appOpen: firstIntake.appOpen, appDeadline: firstIntake.appClose,
        start: firstIntake.start, end: firstIntake.end, timeline, daysLeft,
        description: cpDescription, formTemplate: derivedTemplate, requirements: reqs,
        intakeWindows: titledIntakes,
      };
      saveProgs([newProg, ...progs]);
      attachSelectedProjects(newProg.id);
      sessionStorage.setItem('dsta_pending_toast', attachTotal > 0
        ? `Programme created successfully. ${attachTotal} project${attachTotal !== 1 ? 's' : ''} attached.`
        : 'Programme created successfully.');
      router.push('/programmes');
    }
  }

  function saveAsDraft() {
    const progs    = loadProgrammes();
    const title    = cpTitle.trim() || 'Untitled Draft';
    const firstIntake = cpIntakes[0] ?? { appOpen: '', appClose: '', start: '', end: '' };
    const timeline = firstIntake.start && firstIntake.end ? formatTimeline(firstIntake.start, firstIntake.end) : '—';
    const daysLeft = firstIntake.end ? calcDaysLeft(firstIntake.end) : 0;
    const reqs     = JSON.parse(JSON.stringify(cpReqs));
    // Auto-populate each intake's title from the programme name + its period.
    const titledIntakes = cpIntakes.map(w => ({ ...w, intakeTitle: intakeTitleFor(title, w) }));

    setDirty(false);
    if (isEdit && editingId) {
      const updated = { ...progs.find(p => p.id === editingId)!, title, educationLevel: toEducationLevel(cpCategory[0] ?? 'Undergraduate Student'), status: 'Draft' as ProgStatus, appOpen: firstIntake.appOpen, appDeadline: firstIntake.appClose, start: firstIntake.start, end: firstIntake.end, timeline, daysLeft, description: cpDescription, formTemplate: derivedTemplate, requirements: reqs, intakeWindows: titledIntakes };
      saveProgs(progs.map(p => p.id === editingId ? updated : p));
      attachSelectedProjects(editingId);
      localStorage.setItem('dsta_programme_view', JSON.stringify(updated));
      sessionStorage.setItem('dsta_pending_toast', 'Draft saved. Activate it when ready.');
      router.push(`/programmes/${editingId}`);
    } else {
      const newProg: Programme = {
        id: generateProgId(progs.map(p => p.id)),
        title, educationLevel: toEducationLevel(cpCategory[0] ?? 'Undergraduate Student'), status: 'Draft',
        appOpen: firstIntake.appOpen, appDeadline: firstIntake.appClose,
        start: firstIntake.start, end: firstIntake.end, timeline, daysLeft,
        description: cpDescription, formTemplate: derivedTemplate, requirements: reqs,
        intakeWindows: titledIntakes,
      };
      saveProgs([newProg, ...progs]);
      attachSelectedProjects(newProg.id);
      localStorage.setItem('dsta_programme_view', JSON.stringify(newProg));
      sessionStorage.setItem('dsta_pending_toast', 'Programme saved as draft. Activate it when ready.');
      router.push(`/programmes/${newProg.id}`);
    }
  }

  // Single source of truth for step labels (stepper, card header, Next button).
  const stepTitle = STEP_DEFS[step - 1].label;

  return (
    <Shell activeRoute="/programmes">
      <div className="flex min-h-[calc(100vh-96px)] flex-col">

        {/* Breadcrumb */}
        <nav className="shrink-0 flex items-center gap-2 text-label-md mb-4">
          <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => safeNavigate('/programmes')}>
            Programmes
          </span>
          <ChevronRight size={14} className="text-fg-subtle" />
          <span className="text-fg font-semibold">{isEdit ? 'Edit Programme' : 'Create Programme'}</span>
        </nav>

        {/* Flow hint */}
        {step === 2 && (
          <Alert className="mb-4 bg-[rgba(243,239,229,1)] border-[rgba(230,225,216,1)] text-[rgba(22,33,51,1)]">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Set up programme details, configure intake windows and project assignments, then review everything before creation.
            </AlertDescription>
          </Alert>
        )}

        {/* Stepper */}
        <div className="shrink-0 mb-6">
          <Stepper step={step} onStepClick={n => { setCpErrors({}); setStep(n); }} />
        </div>

        {/* Full-width card */}
        <div className="flex-1">
        <div className="card flex flex-col">

          {/* ── Step 1: Details — dense grid, should fit without scrolling ── */}
          {step === 1 && (
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                <div className="space-y-1.5">
                  <FieldLabelText>
                    Internship Year <span className="text-danger">*</span>
                  </FieldLabelText>
                  <Sel
                    value={String(cpIntakeYear)}
                    onChange={e => changeIntakeYear(parseInt(e.target.value, 10))}
                    aria-label="Internship Year"
                  >
                    {INTAKE_YEARS.map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </Sel>
                </div>

                <div className="space-y-1.5">
                  <FieldLabelText>
                    Intern Category <span className="text-danger">*</span>
                  </FieldLabelText>
                  <Sel
                    className={cn('w-full', cpErrors.category && 'border-danger')}
                    value={selectedCategoryOption?.label ?? ''}
                    onChange={e => {
                      const opt = CATEGORY_OPTIONS.find(o => o.label === e.target.value);
                      selectCategory(opt ? opt.values : []);
                    }}
                  >
                    <option value="" disabled>Select a category…</option>
                    {CATEGORY_OPTIONS.map(({ label }) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </Sel>
                  {cpErrors.category && <p className="text-xs leading-relaxed text-danger">{cpErrors.category}</p>}
                  <p className="text-xs leading-relaxed text-fg-muted">
                    The default application form and eligibility requirements will update automatically.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <FieldLabelText>
                    Programme Title <span className="text-danger">*</span>
                  </FieldLabelText>
                  <Input
                    value={cpTitle}
                    onChange={e => { setCpTitle(e.target.value); if (cpErrors.title) setCpErrors(p => ({ ...p, title: '' })); }}
                    placeholder="e.g. Undergraduate Internship Programme 2027"
                    aria-invalid={Boolean(cpErrors.title)}
                    className={cn(cpErrors.title && 'border-danger focus-visible:outline-none')}
                  />
                  {cpErrors.title && <p className="text-xs leading-relaxed text-danger">{cpErrors.title}</p>}
                </div>

                {/* Application Form preview */}
                <div className="rounded-lg border border-border bg-bg-subtle p-4 lg:col-span-2">
                  <label className="block text-body-sm font-semibold text-fg">Application Form</label>
                  <p className="mb-3 mt-1 text-xs leading-relaxed text-fg-muted">
                    A read-only preview is generated from the selected intern category.
                  </p>
                  <div className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted px-3 py-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="min-w-0">
                        <span className="block text-body-sm font-semibold text-fg">
                          {cpCategory.length === 0
                            ? 'Not configured'
                            : `${selectedCategoryOption?.label ?? ''} Application Form Template`}
                        </span>
                        <span className="block text-caption text-fg-muted">
                          {cpCategory.length === 0
                            ? 'Select an intern category to load the default form.'
                            : 'View or edit application form.'}
                        </span>
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cpCategory.length === 0}
                      onClick={() => setPreviewTemplate(derivedTemplate)}
                    >
                      <Eye size={14} />Preview Application Form
                    </Button>
                  </div>
                </div>

                {/* Eligibility Criteria — derived from the Intern Category above; a compact,
                    width-constrained row that opens a drawer to view/edit. */}
                <div className="rounded-lg border border-border bg-bg-subtle p-4 lg:col-span-2">
                  <label className="block text-body-sm font-semibold text-fg">Eligibility Criteria</label>
                  <p className="mb-3 mt-1 text-xs leading-relaxed text-fg-muted">
                    Who qualifies to apply. Default criteria are set from the selected intern category and can be edited.
                  </p>
                  <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-lg border border-border bg-bg-muted px-3 py-2">
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="min-w-0">
                        <span className="block text-body-sm font-semibold text-fg">
                          {cpCategory.length === 0
                            ? 'Not configured'
                            : `${eligCount} ${eligCount === 1 ? 'criterion' : 'criteria'} configured`}
                        </span>
                        <span className="block text-caption text-fg-muted">
                          {cpCategory.length === 0
                            ? 'Select an intern category above to load criteria'
                            : 'View or edit eligibility criteria'}
                        </span>
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cpCategory.length === 0}
                      onClick={() => setReqsDrawer('view')}
                    >
                      <Eye size={14} />Preview Criteria
                    </Button>
                  </div>
                </div>

                {/* Row 3: Programme Description */}
                <Field className="lg:col-span-2">
                  <FieldLabel>Programme Description <span className="text-fg-muted font-normal">(Optional)</span></FieldLabel>
                  <FieldDescription>
                    Shown to applicants.
                  </FieldDescription>
                  <Textarea
                    value={cpDescription}
                    onChange={e => setCpDescription(e.target.value)}
                    placeholder="Describe the programme objectives, learning opportunities, and expected experience…"
                    rows={4}
                    className="resize-none"
                  />
                </Field>

                {/* Status — edit mode only */}
                {isEdit && (
                  <div className="lg:col-span-2">
                    <label className="block text-body-sm font-semibold text-fg">Programme Status</label>
                    <p className="mb-1 mt-1 text-xs leading-relaxed text-fg-muted">
                      Active programmes accept applications.
                    </p>
                    <Sel value={cpStatus} onChange={e => setCpStatus(e.target.value as ProgStatus)}>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                    </Sel>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ── Step 2: Set Up Intakes & Assign Projects ── */}
          {step === 2 && (
            <div className="px-0 py-0">
              {(() => {
                const poolSubtitle = selectedIntake
                  ? `Intake ${selectedIndex + 1} · ${selectedIntake.start && selectedIntake.end ? intakeLabel(selectedIntake) : 'Set internship window'}`
                  : 'Select an intake to see projects';

                return (
                  <div className="space-y-5">
                    <div className="relative">
                      <section className="grid min-h-[620px] overflow-hidden rounded-lg bg-surface lg:grid-cols-[360px_minmax(0,1fr)]">
                      <aside className="relative z-10 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-t-lg border-b border-border bg-surface shadow-lg lg:overflow-visible lg:rounded-b-none lg:rounded-l-lg lg:border-b-0 lg:border-r">
                        <div className="space-y-3 border-b border-border bg-surface px-4 py-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h2 className="text-label-lg font-semibold text-fg">Configure Intakes</h2>
                              <p className="mt-0.5 text-caption text-fg-muted">
                                {cpIntakes.length} intake{cpIntakes.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Button type="button" variant="primary" size="sm" onClick={addIntake}>
                              <Plus size={14} />Add Intakes
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_80px] border-b border-border bg-[rgba(253,252,250,1)] px-4 py-3 text-caption text-fg-muted">
                          <span>Intake</span>
                          <span className="flex items-center justify-end gap-1">
                            Projects assigned
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <button
                                      type="button"
                                      aria-label="Projects assigned help"
                                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                                    >
                                      <Info size={12} />
                                    </button>
                                  }
                                />
                                <TooltipContent side="top" align="end" className="max-w-56">
                                  Number of projects assigned to this intake.
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </span>
                        </div>

                        <div className="flex min-w-0 flex-col">
                          {cpIntakes.map((intake, i) => {
                            const intakeId = intake.id as string | undefined;
                            const assignedIds = intakeId ? (cpAttach[intakeId] ?? []) : [];
                            const assignedCount = assignedIds.length;
                            const isActive = selectedIntakeId === intakeId;
                            const periodLabel = intake.start && intake.end ? intakeLabel(intake) : 'Set internship window';
                            return (
                              <div
                                key={intakeId ?? i}
                                role="button"
                                tabIndex={0}
                                onClick={() => selectIntake(intakeId ?? null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setOpenIntakeId(intakeId ?? null);
                                  }
                                }}
                                className={cn(
                                  'group relative box-border w-full min-w-0 cursor-pointer border-b px-4 py-3 transition-colors',
                                  isActive ? 'z-10 border-y border-border bg-bg-muted' : 'border-border bg-surface hover:bg-bg-subtle',
                                )}
                              >
                                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_80px] items-center gap-3">
                                  <div className={cn('min-w-0 text-left', isActive && 'pr-3')}>
                                    <span className={cn('block truncate text-body-sm', isActive ? 'font-semibold text-fg' : 'font-medium text-fg')}>
                                      Intake {i + 1} · {periodLabel}
                                    </span>
                                    <span className="mt-1 block truncate text-caption text-fg-muted">
                                      {intake.appOpen && intake.appClose
                                        ? `Applications: ${formatDate(intake.appOpen)} – ${formatDate(intake.appClose)}`
                                        : 'Set application window'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-1">
                                    <div className="flex h-7 w-7 items-center justify-center">
                                      {isActive ? (
                                        <Check size={15} className="text-success" aria-label="Selected" />
                                      ) : (
                                        <span className="text-body-sm font-semibold text-fg">{assignedCount}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isActive && (
                                  <span
                                    className="absolute right-[-11px] top-1/2 z-10 h-full w-[11px] -translate-y-1/2 bg-[length:auto_100%] bg-right bg-no-repeat"
                                    style={{ backgroundImage: 'url(/assets/request-arrow.svg)' }}
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </aside>

                      <section className="flex min-h-0 min-w-0 flex-col rounded-b-lg bg-surface lg:rounded-b-none lg:rounded-r-lg">
                        <div className="flex flex-col gap-3 border-b border-border bg-[rgba(249,248,244,1)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-label-md font-semibold text-fg">Assign Projects</h3>
                            <p className="mt-0.5 text-caption text-fg-muted">Assign projects to the selected intake.</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-caption text-accent">
                              {assignedProjects.length} project{assignedProjects.length !== 1 ? 's' : ''} assigned
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={cpIntakes.length <= 1}
                              onClick={() => removeIntake(selectedIndex)}
                            >
                              <Trash2 size={14} />Delete
                            </Button>
                          </div>
                        </div>

                        {selectedIntake && (
                          <div className="border-border px-4 py-4">
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1px_1fr_2fr]">
                              <div className="min-w-0">
                                <Field>
                                  <FieldLabel>
                                    Application Window <span className="text-danger">*</span>
                                  </FieldLabel>
                                  <DateRangePicker
                                    start={selectedIntake.appOpen}
                                    end={selectedIntake.appClose}
                                    onChange={(openDate, closeDate) => {
                                      const next = cpIntakes.map((w, j) => j === selectedIndex ? { ...w, appOpen: openDate, appClose: closeDate } : w);
                                      setCpIntakes(next);
                                      setCpErrors(p => {
                                        const n = { ...p };
                                        delete n[`intake_${selectedIndex}_appOpen`];
                                        delete n[`intake_${selectedIndex}_appClose`];
                                        return n;
                                      });
                                    }}
                                    placeholder="Pick the application dates"
                                    lockStart={isEdit && selectedIndex === 0}
                                    minDate={sgToday()}
                                    error={Boolean(cpErrors[`intake_${selectedIndex}_appOpen`] || cpErrors[`intake_${selectedIndex}_appClose`])}
                                  />
                                  {(cpErrors[`intake_${selectedIndex}_appOpen`] || cpErrors[`intake_${selectedIndex}_appClose`]) && (
                                    <FieldError>{cpErrors[`intake_${selectedIndex}_appOpen`] || cpErrors[`intake_${selectedIndex}_appClose`]}</FieldError>
                                  )}
                                </Field>
                              </div>
                              <div className="hidden lg:block border-l border-border" aria-hidden="true" />
                              <div className="min-w-0">
                                <Field>
                                  <FieldLabel>
                                    Internship Window <span className="text-danger">*</span>
                                  </FieldLabel>
                                  <DateRangePicker
                                    placeholder="Pick the internship start and end dates"
                                    error={!!(cpErrors[`intake_${selectedIndex}_start`] || cpErrors[`intake_${selectedIndex}_end`])}
                                    start={selectedIntake.start}
                                    end={selectedIntake.end}
                                    onChange={(startDate, endDate) => {
                                      const next = cpIntakes.map((w, j) => j === selectedIndex ? {
                                        ...w,
                                        start: startDate,
                                        end: endDate,
                                      } : w);
                                      setCpIntakes(next);
                                      setCpErrors(p => {
                                        const n = { ...p };
                                        delete n[`intake_${selectedIndex}_start`];
                                        delete n[`intake_${selectedIndex}_end`];
                                        return n;
                                      });
                                    }}
                                  />
                                  {(cpErrors[`intake_${selectedIndex}_start`] || cpErrors[`intake_${selectedIndex}_end`]) && (
                                    <FieldError>{cpErrors[`intake_${selectedIndex}_start`] || cpErrors[`intake_${selectedIndex}_end`]}</FieldError>
                                  )}
                                </Field>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex min-h-0 flex-1 flex-col">
                          <div className="border-border px-4 py-3">
                            <Tabs value={assignFilter} onValueChange={value => setAssignFilter(value as 'assigned' | 'unassigned')}>
                              <TabsList aria-label="Filter projects for this intake">
                                <TabsTrigger
                                  value="unassigned"
                                  className={cn(
                                    'gap-1.5',
                                    notAssignedProjects.length > 0 && 'text-warning hover:text-warning data-[active]:text-warning',
                                  )}
                                >
                                  {notAssignedProjects.length > 0 && <AlertTriangle size={13} />}
                                  Not assigned ({notAssignedProjects.length})
                                </TabsTrigger>
                                <TabsTrigger value="assigned">Assigned ({assignedProjects.length})</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>

                          <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            {!cpLevel ? (
                              <div className="rounded-lg border border-border bg-bg-subtle">
                                <EmptyState
                                  icon={Folder}
                                  title="Select an intern category"
                                  description="Choose an intern category in Programme Details to load the matching project pool."
                                  size="sm"
                                />
                              </div>
                            ) : visibleProjects.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-border bg-bg-subtle/40">
                                <EmptyState
                                  icon={Folder}
                                  title={assignFilter === 'assigned' ? 'No projects assigned yet' : 'Nothing left to add'}
                                  description={assignFilter === 'assigned'
                                    ? 'No projects have been assigned to this intake. Check the "Not assigned" tab to add some.'
                                    : 'Every project in the pool is already assigned to this intake.'}
                                  size="sm"
                                />
                              </div>
                            ) : (
                              <div className="overflow-hidden border-border bg-surface">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Project Name</TableHead>
                                      <TableHead>Programme Centre</TableHead>
                                      <TableHead>Project Duration</TableHead>
                                      <TableHead>Placements</TableHead>
                                      <TableHead>Match</TableHead>
                                      <TableHead className="w-24 text-right"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {visibleProjects.map(p => (
                                      <ProjectTableRow
                                        key={p.id}
                                        project={p}
                                        selectedIntake={selectedIntake}
                                        selectedIntakeId={selectedIntakeId}
                                        cpPlacement={cpPlacement}
                                        assignedToIntake={assignedToIntake}
                                        onToggleAttach={toggleAttach}
                                        onOpenSingleAssign={openSingleAssign}
                                        onOpenPeriodEdit={openPeriodEdit}
                                      />
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    </section>
                    {isPendingIntakeTransition && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface/60 backdrop-blur-[1px]">
                        <Spinner size="lg" label="Switching intake..." />
                      </div>
                    )}
                  </div>
                </div>
                );
              })()}
            </div>
          )}

          {step === 2 && (
            <>
              <Sheet open={!!assignDialog} onOpenChange={open => { if (!open) setAssignDialog(null); }}>
                <SheetContent side="right" className="w-full sm:max-w-[560px]">
                  <SheetHeader>
                    <SheetTitle>Manage Project Allocation</SheetTitle>
                    <SheetDescription>
                      {assignDialog?.mode === 'batch'
                        ? `${assignDialog.projectIds.length} selected project${assignDialog.projectIds.length !== 1 ? 's' : ''}`
                        : (() => {
                            const project = assignDialog ? availableProjects.find(p => p.id === assignDialog.projectIds[0]) : null;
                            return project
                              ? `${project.title} · ${project.internshipPeriodStart ?? 'No start'} – ${project.internshipPeriodEnd ?? 'No end'}`
                              : 'Choose one or more intake windows.';
                          })()}
                    </SheetDescription>
                  </SheetHeader>

                  <SheetBody className="space-y-4">
                    {assignDialog?.mode === 'single' && (() => {
                      const project = assignSheetProject;
                      if (!project) return null;
                      const assignedCount = intakeIdsForProject(project.id).length;
                      return (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
                            <p className="text-label-sm font-semibold text-fg-muted">Total intern spots</p>
                            <p className="mt-1 text-headline-md text-fg">{project.slots}</p>
                          </div>
                          <div className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
                            <p className="text-label-sm font-semibold text-fg-muted">Assigned intakes</p>
                            <p className="mt-1 text-headline-md text-fg">{assignedCount}</p>
                          </div>
                        </div>
                      );
                    })()}
                    <p className="text-body-sm text-fg-muted">
                      Tick the intakes this project should run in. Its {assignSheetProject?.slots ?? 0} intern spot{(assignSheetProject?.slots ?? 0) === 1 ? '' : 's'} {(assignSheetProject?.slots ?? 0) === 1 ? 'is' : 'are'} shared across them — whichever intake fills up first takes the spots.
                    </p>
                    <div className="space-y-2">
                      {cpIntakes.map((w, idx) => {
                        if (!w.id) return null;
                        const intakeId = w.id as string;
                        const project = assignSheetProject;
                        const checked = assignDraftIntakes.includes(intakeId);
                        const isSuggested = !!project && fitsIntake(project, w);
                        return (
                          <div
                            key={intakeId}
                            className={cn(
                              'rounded-lg border bg-surface px-4 py-4',
                              checked ? 'border-accent bg-accent/5' : 'border-border',
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-body-md font-semibold text-fg">Intake {idx + 1} · {intakeLabel(w)}</p>
                                  <span className={cn(
                                    'rounded-md border px-2 py-0.5 text-caption font-semibold',
                                    isSuggested ? 'border-success/30 bg-success-bg text-success' : 'border-border bg-bg-subtle text-fg-muted',
                                  )}>
                                    {isSuggested ? 'Auto suggested' : 'Manual option'}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-caption text-fg-muted">
                                  Internship window: {isoToMMMYY(w.start) || 'Not set'} – {isoToMMMYY(w.end) || 'Not set'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="flex cursor-pointer items-center gap-2 text-body-sm font-semibold text-fg">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleDraftIntake(intakeId)}
                                  aria-label={`Assign to Intake ${idx + 1}`}
                                />
                                Assign to this intake
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {assignDialog?.mode === 'batch' && (
                      <div className="rounded-lg border border-border bg-bg-subtle p-3">
                        <p className="mb-2 text-label-sm font-semibold text-fg-muted">Mode</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            type="button"
                            variant={batchAssignMode === 'add' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setBatchAssignMode('add')}
                          >
                            Add to selected intakes
                          </Button>
                          <Button
                            type="button"
                            variant={batchAssignMode === 'replace' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setBatchAssignMode('replace')}
                          >
                            Replace selected intakes
                          </Button>
                        </div>
                      </div>
                    )}
                  </SheetBody>

                  <SheetFooter>
                    <Button type="button" variant="ghost" onClick={() => setAssignDialog(null)}>Cancel</Button>
                    <Button type="button" onClick={applyAssignmentDialog}>Save allocation</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <Sheet open={!!periodEdit} onOpenChange={open => { if (!open) setPeriodEdit(null); }}>
                <SheetContent side="right" className="w-full sm:max-w-[480px]">
                  <SheetHeader>
                    <SheetTitle>Set internship window</SheetTitle>
                    <SheetDescription>
                      The hosting window for {periodEdit?.title}. Saving updates the project and re-checks it against every intake.
                    </SheetDescription>
                  </SheetHeader>

                  <SheetBody>
                    <div>
                      <label className="block text-body-sm font-semibold text-fg mb-1">Internship window</label>
                      <DateRangePicker
                        placeholder="Pick the internship start and end dates"
                        start={periodEdit?.start ?? ''}
                        end={periodEdit?.end ?? ''}
                        onChange={(startDate, endDate) => setPeriodEdit(prev => prev && { ...prev, start: startDate, end: endDate })}
                      />
                    </div>
                  </SheetBody>

                  <SheetFooter>
                    <Button type="button" variant="ghost" onClick={() => setPeriodEdit(null)}>Cancel</Button>
                    <Button type="button" onClick={savePeriodEdit} disabled={!periodEdit?.start || !periodEdit?.end}>Save period</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="px-6 py-5">
              <OverviewSection
                title={cpTitle}
                year={cpIntakeYear}
                description={cpDescription}
                category={cpCategory}
                intakes={cpIntakes}
                groups={cpReqs}
                formTemplate={derivedTemplate}
                attachmentMap={cpAttach}
                onPreviewApplicationForm={() => setPreviewTemplate(derivedTemplate)}
                onPreviewCriteria={() => setReqsDrawer('view')}
                onCancel={() => setStep(2)}
              />

              {(() => {
                if (!reqsChanged) return null;
                const n = screenedAgainstOldCriteria().length;
                if (!n) return null;
                return (
                  <div className="mt-5 rounded-xl border border-warning/30 bg-warning-bg px-4 py-3.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-body-sm font-semibold text-fg">You changed the eligibility criteria</p>
                        <p className="text-body-sm text-fg-muted mt-0.5 leading-relaxed">
                          <strong>{n}</strong> application{n !== 1 ? 's' : ''} for this programme {n !== 1 ? 'were' : 'was'} already screened against the previous criteria. Existing results won&apos;t change unless you re-screen. Applicants already shortlisted or further along are not affected.
                        </p>
                        <label className="flex items-center gap-2 mt-2.5 cursor-pointer w-fit">
                          <input type="checkbox" checked={rescreenAffected} onChange={e => setRescreenAffected(e.target.checked)}
                            className="w-4 h-4 rounded border-border accent-accent cursor-pointer shrink-0" />
                          <span className="text-body-sm text-fg">Re-screen {n} application{n !== 1 ? 's' : ''} against the updated criteria on save</span>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
        </div>

        {/* Footer — full-bleed sticky action bar (matches the project-request wizard) */}
        <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface/95 px-[clamp(24px,2.6vw,40px)] py-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] backdrop-blur">
          <Button variant="ghost" onClick={() => safeNavigate('/programmes')}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            {step === 1 ? (
              <>
                <Button variant="outline" onClick={saveAsDraft}>
                  Save as Draft
                </Button>
                <Button onClick={goToIntakes}>
                  {/* label derived from STEP_DEFS so it always matches the step header */}
                  Next: {STEP_DEFS[step].label} <ArrowRight size={16} />
                </Button>
              </>
            ) : step === 2 ? (
              /* Set Up Intakes & Assign Projects — validate intakes before Review */
              <>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={saveAsDraft}>
                  Save as Draft
                </Button>
                <Button onClick={goToAttach} disabled={!canReviewIntakes} title={!canReviewIntakes ? 'Complete all intake dates before reviewing.' : undefined}>
                  Next: {STEP_DEFS[step].label} <ArrowRight size={16} />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(2)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={saveAsDraft}>
                  Save as Draft
                </Button>
                <Button onClick={submitWizard}>
                  {isEdit
                    ? 'Save Changes'
                    : 'Create Programme'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Template preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal templateName={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}

      {/* Eligibility criteria sheet — keeps Programme Details uncluttered. 'view' shows the
          detailed read-only breakdown (with an Edit affordance); 'edit' shows the builder. */}
      <Sheet open={reqsDrawer !== null} onOpenChange={(open) => !open && setReqsDrawer(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[640px]">
          <SheetHeader>
            <SheetTitle>{reqsDrawer === 'edit' ? 'Edit criteria' : 'Eligibility criteria'}</SheetTitle>
            {cpCategory.length > 0 && (
              <SheetDescription>{cpCategory.join(', ')}</SheetDescription>
            )}
          </SheetHeader>
          <SheetBody className="space-y-5">
            {reqsDrawer === 'edit' ? (
              <>
                <section>
                  <p className="mb-3 text-label-sm font-semibold text-fg-subtle">Basic Requirements</p>
                  <BasicsPanel groups={cpReqs} onChange={setCpReqs} />
                </section>
                <section>
                  <p className="mb-4 text-label-sm font-semibold text-fg-subtle">Academic Requirements</p>
                  <ReqBuilder groups={cpReqs} onChange={setCpReqs} hiddenRuleIds={baselineRuleIds(cpReqs)} />
                </section>
              </>
            ) : (
              /* Plain-English summary only — this is exactly what the applicant sees.
                 The technical rule-builder breakdown (groups / operators / options)
                 lives in Edit mode, not here, to keep the IO's read view uncluttered. */
              <ReqNarrativeView groups={cpReqs} />
            )}
          </SheetBody>
          <SheetFooter className={cn(reqsDrawer === 'view' && 'justify-between sm:justify-between')}>
            {reqsDrawer === 'edit' ? (
              <Button onClick={() => setReqsDrawer(null)}>
                <Check size={15} />Done
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setReqsDrawer(null)}>Close</Button>
                <Button onClick={() => setReqsDrawer('edit')}>
                  <Pencil size={15} />Edit criteria
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>


      {/* Disabled for now — re-enable by uncommenting (and its import above). */}
      {/* <PreviewFlagFab /> */}

    </Shell>
  );
}
