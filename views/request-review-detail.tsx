'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import Modal from '@/components/ui-legacy/modal';
import { Badge } from '@/components/ui/badge';
import { UnderlineTabs } from '@/components/ui-legacy/underline-tabs';
import Accordion from '@/components/ui-legacy/accordion';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle, Check, ChevronRight,
  X, Pencil, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { SUBMISSION_SEED, DEFAULT_PROGRAMMES, PC_CODES, TECH_DOMAINS, EMERGING_AREAS, INTERN_CATEGORIES, EDUCATION_LEVELS, toEducationLevel, progEducationLevelMap, batchEducationLevel, STATUS_COLOURS } from '@/lib/data';
import { projectMatchesRequest } from '@/lib/request-groups';
import { loadSubmissions, saveSubmissions, loadProjects, saveProjects, loadRequests, saveRequests } from '@/lib/storage';
import { addNotification } from '@/lib/notifications';
import { useRole } from '@/lib/role';
import { logAccess } from '@/lib/audit';
import { loadDceApprovalEnabled } from '@/lib/dce';
import { cn } from '@/lib/utils';
import Combobox from '@/components/ui-legacy/combobox';
import DateRangePicker from '@/components/ui-legacy/date-range-picker';
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline } from '@/lib/disciplines';
import { periodLabelToMMMYY, mmmyyToISO, mmmyyToISOEnd } from '@/lib/internship-period';
import type { ProjectEntry, ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';

const DURATION_OPTS = ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months', '12 Months'];
const LOCATION_OPTS = ['Hybrid', 'On-Site'];

/** Normalise a stored internship-window value to an ISO day ("2026-06-01"); legacy
   month values (MMMYY / "Jun 2026") become the first / last day of the month. */
function isoDay(v: string | undefined | null, isEnd: boolean): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = periodLabelToMMMYY(v);
  return m ? (isEnd ? mmmyyToISOEnd(m) : mmmyyToISO(m)) : '';
}

/** Display a stored internship-window value: ISO day → "1 Jun 2026"; month → "Jun 2026". */
function periodDisplay(v?: string): string {
  if (!v) return '';
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
  const m = periodLabelToMMMYY(v);
  return m ? `${m.slice(0, 3)} 20${m.slice(3)}` : v;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-SG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── AI checks ─────────────────────────────────────────────────────────────── */
function checkGrammarTone(
  title: string, description: string,
): { result: 'pass' | 'warn' | 'fail'; notes: string[] } {
  const notes: string[] = [];

  // Title checks
  if (!/^[A-Z]/.test(title.trim())) {
    notes.push('Project title should begin with a capital letter.');
  }
  if (/\b(project|internship|intern)\b/i.test(title)) {
    notes.push('Avoid generic words like "Project" or "Internship" in the title — the context is already implied.');
  }
  if (title.trim().split(/\s+/).filter(Boolean).length < 3) {
    notes.push('Project title is too brief. Use a descriptive title of at least 3 words.');
  }

  // Description checks
  const sentences = description
    .replace(/([.!?])\s+(?=[A-Za-z])/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(Boolean);
  if (sentences.some(s => /^[a-z]/.test(s))) {
    notes.push('Some sentences in the description do not begin with a capital letter. Review for consistent capitalisation.');
  }
  if (/\bhe\/she\b|\bhe or she\b/i.test(description)) {
    notes.push('Replace "he/she" with "the intern" or rewrite in second-person phrasing ("You will…").');
  }
  if (/\bgonna\b|\bwanna\b|\bkinda\b|\bfyi\b|\basap\b/i.test(description)) {
    notes.push('Informal language detected. Use professional, formal phrasing throughout the description.');
  }

  const failCount = notes.filter(n =>
    n.includes('capital letter') && n.includes('title') ||
    n.includes('too brief'),
  ).length;
  return { result: notes.length === 0 ? 'pass' : failCount >= 1 ? 'fail' : 'warn', notes };
}

function checkReadability(
  description: string, category?: string,
): { result: 'pass' | 'warn' | 'fail'; notes: string[] } {
  const notes: string[] = [];
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount < 25) {
    notes.push(`Description is too brief (${wordCount} words). Aim for at least 40–60 words covering intern tasks, tools used, and learning outcomes.`);
  }

  const sentences = description
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1|||')
    .split('|||')
    .map(s => s.trim())
    .filter(Boolean);
  if (sentences.some(s => s.split(/\s+/).length > 50)) {
    notes.push('One or more sentences are very long and may be difficult to follow. Consider breaking them into shorter, clearer statements.');
  }

  const jcCategories = ['Young Defence Scientist Programme', 'Junior College Scholar/Junior College Student'];
  const advancedTerms = /\b(stochastic|heterogeneous|eigenvalue|bayesian inference|markov chain|convex optimization|fourier transform|propagation matrix|differential equation|tensor decomposition|backpropagation|variational inference)\b/i;
  if (category && jcCategories.includes(category) && advancedTerms.test(description)) {
    notes.push(`The "${category}" track targets pre-university students. Simplify technical language to suit the audience.`);
  }

  return { result: notes.length === 0 ? 'pass' : 'warn', notes };
}

function checkScopeAlignment(
  description: string, category?: string, skills?: string[],
): { result: 'pass' | 'warn' | 'fail'; notes: string[] } {
  const notes: string[] = [];
  const lower = description.toLowerCase();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  if (wordCount < 25) {
    return { result: 'fail', notes: ['Project scope is too brief. Expand to at least 30–50 words covering intern tasks, learning outcomes, and expected deliverables.'] };
  }
  if (!/\b(intern|you will|student|applicant|you'll|candidate|participant)\b/i.test(description)) {
    notes.push('Scope does not directly address the intern. Rewrite using intern-facing language (e.g., "Interns will…", "You will…").');
  }
  if (!/\b(deliver|report|prototype|model|system|tool|dashboard|analysis|present|produce|build|develop|implement|document|code|paper)\b/i.test(description)) {
    notes.push('No expected deliverables identified. State what the intern will produce or present at the end of the internship.');
  }
  const jcCategories = ['Young Defence Scientist Programme', 'Junior College Scholar/Junior College Student'];
  const advancedTerms = /\b(stochastic|heterogeneous|eigenvalue|bayesian inference|markov chain|convex optimization|fourier transform|propagation matrix|differential equation|tensor decomposition|backpropagation|variational inference)\b/i;
  if (category && jcCategories.includes(category) && advancedTerms.test(description)) {
    notes.push(`Category "${category}" targets pre-university students. Simplify the language to suit this audience.`);
  }
  if (skills && skills.length > 0 && skills.filter(s => lower.includes(s.toLowerCase())).length === 0) {
    notes.push('None of the required skills appear in the project scope. Ensure the scope reflects how listed skills will be applied.');
  }
  return { result: notes.length === 0 ? 'pass' : 'warn', notes };
}

/* ── Sub-components ───────────────────────────────────────────────────────── */
type AiCheckResultStatus = 'pass' | 'warn' | 'fail';

function aiCheckStatusLabel(result: AiCheckResultStatus) {
  if (result === 'pass') return 'Passed';
  if (result === 'fail') return 'Must fix';
  return 'Needs review';
}

function AiCheckPill({ result, label }: { result: 'pass' | 'warn' | 'fail'; label: string }) {
  const cls =
    result === 'pass' ? 'bg-success-bg text-success border-success/30' :
    result === 'warn' ? 'bg-warning-bg text-warning border-warning/30' :
                        'bg-danger-bg text-danger border-danger/30';
  return (
    <span className={cn('inline-flex items-center text-[12px] font-bold px-2 py-0.5 rounded-full border', cls)}>
      {result === 'pass' ? <Check size={9} className="mr-1" /> : <AlertTriangle size={9} className="mr-1" />}
      {label}
    </span>
  );
}

function AiRecommendationBanner({ onReview }: { onReview: () => void }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning-bg/40 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <AiSparkleIcon size={13} />
          <div>
            <p className="text-body-sm font-bold text-fg">1 AI recommendation requires attention</p>
            <p className="text-body-sm text-fg-muted">
              AI checks provide guidance only. Review the flagged field together with the complete project information before making a decision.
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onReview} className="shrink-0 text-accent">
          Review Item <ChevronDown size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ReviewSummaryCards({ version, submittedAt }: { version: string; submittedAt?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-4 py-3 first:pl-0 last:pr-0 sm:py-0">
          <p className="text-caption font-semibold text-fg-muted">Required fields</p>
          <p className="mt-1 text-body-md font-bold text-fg">Complete</p>
          <p className="text-caption text-fg-muted">All mandatory information is present</p>
        </div>
        <div className="px-4 py-3 first:pl-0 last:pr-0 sm:py-0">
          <p className="text-caption font-semibold text-fg-muted">AI checks</p>
          <p className="mt-1 text-body-md font-bold text-fg">1 recommendation</p>
          <p className="text-caption text-fg-muted">1 additional check passed</p>
        </div>
        <div className="px-4 py-3 first:pl-0 last:pr-0 sm:py-0">
          <p className="text-caption font-semibold text-fg-muted">Review version</p>
          <p className="mt-1 text-body-md font-bold text-fg">{version}</p>
          <p className="text-caption text-fg-muted">Submitted {formatDateTime(submittedAt)}</p>
        </div>
      </div>
    </div>
  );
}

function SubmissionInformationCard({
  projectId, request, submittedBy, submittedOn, lastUpdated,
}: {
  projectId: string; request: string; submittedBy: string;
  submittedOn: string; lastUpdated: string;
}) {
  const rows = [
    { label: 'Project ID', value: projectId, fullWidth: true },
    { label: 'Request', value: request },
    { label: 'Submitted by', value: submittedBy },
    { label: 'Submitted on', value: submittedOn },
    { label: 'Last updated', value: lastUpdated },
  ];
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-body-md font-bold text-fg">Submission Information</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
        {rows.map(({ label, value, fullWidth }) => (
          <div key={label} className={fullWidth ? 'col-span-2' : ''}>
            <p className="text-caption text-fg-muted">{label}</p>
            <p className="mt-0.5 text-body-sm font-medium text-fg">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewChecklistCard({
  requiredFieldsPass,
  scopeNeedsJudgement,
  titleChecked,
}: {
  requiredFieldsPass: boolean;
  scopeNeedsJudgement: boolean;
  titleChecked: boolean;
}) {
  const items = [
    { label: 'Required fields complete', sub: 'No mandatory fields are missing', pass: requiredFieldsPass },
    { label: 'Project Scope needs judgement', sub: 'AI recommendation does not block approval', pass: !scopeNeedsJudgement, warn: scopeNeedsJudgement },
    { label: 'Project Title checked', sub: 'Clear for applicant-facing use', pass: titleChecked },
  ];
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-body-md font-bold text-fg">Review Checklist</h2>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <div className={cn(
              'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
              item.warn ? 'bg-warning/10 text-warning' : item.pass ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            )}>
              {item.warn ? <AlertTriangle size={12} /> : item.pass ? <Check size={12} /> : <X size={12} />}
            </div>
            <div>
              <p className={cn('text-body-sm font-semibold', item.warn ? 'text-fg' : 'text-fg')}>{item.label}</p>
              <p className="text-caption text-fg-muted">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewRequiredSection({
  proj,
  batch,
  descriptionResult,
  readabilityCheck,
  scopeCheck,
  canReview,
  onEdit,
}: {
  proj: SubmittedProject;
  batch: ProjectSubmissionBatch;
  descriptionResult: 'pass' | 'warn' | 'fail';
  readabilityCheck: { result: 'pass' | 'warn' | 'fail'; notes: string[] };
  scopeCheck: { result: 'pass' | 'warn' | 'fail'; notes: string[] } | null;
  canReview: boolean;
  onEdit: () => void;
}) {
  const aiRunDate = proj.submittedAt
    ? new Date(new Date(proj.submittedAt).getTime() + 2 * 60 * 1000).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const submittedBy = proj.submittedBy || batch.submittedBy || 'AD (P&C)';
  const descriptionNotes = [...readabilityCheck.notes, ...(scopeCheck?.notes ?? [])];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-body-md font-bold text-fg">Review required</h2>
        <span className="inline-flex items-center rounded-full bg-[rgba(254,154,0,0.15)] px-2 py-0.5 text-[11px] font-bold text-[#BB4D00]">1 item</span>
      </div>
      <p className="mt-1 text-body-sm text-fg-muted">Only items that need reviewer judgement appear in this section.</p>

      <div className="mt-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-body-md font-bold text-fg">Project Scope</p>
            <p className="text-caption text-fg-muted">
              Submitted by {submittedBy} · AI check run on {aiRunDate}
            </p>
          </div>
          <span className="badge inline-flex items-center gap-1 text-caption font-normal border border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.05)] text-[rgba(26,101,248,1)]">
            <AiSparkleIcon size={12} /> AI Recommendation
          </span>
        </div>

        <div className="mt-4">
          <p className="text-caption font-semibold text-fg-muted">Submitted value</p>
          <p className="mt-1 text-body-sm text-fg leading-relaxed">{proj.description}</p>
        </div>

        {descriptionResult !== 'pass' && (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-3 py-3">
            <div className="flex items-start gap-2">
              <div>
                <p className="text-caption font-semibold text-accent"><AiSparkleIcon size={13} className="inline" />AI Recommendation</p>
                <ul className="mt-1 space-y-0.5">
                  {descriptionNotes.slice(0, 2).map((note, idx) => (
                    <li key={idx} className="text-caption leading-snug text-accent">{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {canReview && (
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectDetailsSection({ metaItems }: { metaItems: { label: string; value: string }[] }) {
  const basic = metaItems.filter(i =>
    ['Project Title', 'Programme Centre', 'Intern Category', 'Tech Competency', 'Discipline of Study'].includes(i.label)
  );
  const placements = metaItems.filter(i =>
    ['No. of Placements', 'Project Duration', 'Internship Window'].includes(i.label)
  );
  const mentors = metaItems.filter(i =>
    i.label.includes('Mentor')
  );

  const Grid = ({ items }: { items: { label: string; value: string }[] }) => (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-[12px] font-bold uppercase tracking-wider text-fg-subtle">{label}</p>
          <p className="mt-0.5 text-body-sm text-fg">{value}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <h2 className="text-body-md font-bold text-fg">Project details</h2>
      <p className="text-body-sm text-fg-muted">Complete submitted information, grouped for progressive disclosure.</p>
      <div className="mt-4 space-y-0">
        <Accordion title="Basic Information" defaultOpen first>
          <Grid items={basic} />
        </Accordion>
        <Accordion title="Placements & Timeline">
          <Grid items={placements} />
        </Accordion>
        <Accordion title="Mentors" last>
          <Grid items={mentors} />
        </Accordion>
      </div>
    </div>
  );
}

function ActivitySection({ activities }: { activities: { date: string; title: string; actor?: string }[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-body-md font-bold text-fg">Activity</h2>
      <p className="text-body-sm text-fg-muted">System and user actions recorded for this submission.</p>
      <div className="mt-6 space-y-0">
        {activities.map((a, idx) => (
          <div key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border">
            <p className="w-32 shrink-0 text-caption text-fg-muted">{a.date}</p>
            <div>
              <p className="text-body-sm text-fg">{a.title}</p>
              {a.actor && <p className="text-caption text-fg-muted">{a.actor}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomActionBar({
  reviewingLabel,
  onReturn,
  onReject,
  onApprove,
}: {
  reviewingLabel: string;
  onReturn: () => void;
  onReject: () => void;
  onApprove: () => void;
}) {
  const router = useRouter();
  return (
    <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-8 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-2">
      <p className="text-body-sm text-fg-muted">{reviewingLabel}</p>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
        <Button variant="outline" size="md" onClick={() => router.back()}>
          Back
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={onReturn}
          className="bg-[rgba(251,44,54,0.1)] text-[#C10007] hover:bg-[rgba(251,44,54,0.15)]"
        >
          Return for Update
        </Button>
        <Button variant="danger" size="md" onClick={onReject}>
          Reject Project
        </Button>
        <Button size="md" onClick={onApprove}>
          Approve Project
        </Button>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function RequestReviewDetail() {
  const router = useRouter();
  const params = useParams<{ batchId: string; projId: string }>();
  const batchId = decodeURIComponent(params.batchId ?? '');
  const projId = decodeURIComponent(params.projId ?? '');
  const reviewRef = useRef<HTMLDivElement>(null);

  const { role, profile } = useRole();
  const dceEnabled = loadDceApprovalEnabled();
  const canReviewProjects = role === 'io' || role === 'io-admin';
  const { toast, showToast } = useToast();

  const [batches, setBatches] = useState<ProjectSubmissionBatch[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<SubmittedProject | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [activeTab, setActiveTab] = useState('review');

  const progMap = Object.fromEntries(DEFAULT_PROGRAMMES.map(p => [p.id, p.title]));
  const eduMap = progEducationLevelMap();

  useEffect(() => {
    const data = loadSubmissions();
    setBatches(data.length > 0 ? data : SUBMISSION_SEED);
  }, []);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const batch = batches.find(b => b.id === batchId) ?? null;
  const proj = batch?.projects.find(p => p.id === projId) ?? null;
  const requestedLevels = batch?.requestedEducationLevels ?? [];
  const levelMismatch = !!proj?.educationLevel && requestedLevels.length > 0 && !requestedLevels.includes(proj.educationLevel);
  const grammarCheck = proj ? checkGrammarTone(proj.title, proj.description) : { result: 'pass' as const, notes: [] };
  const readabilityCheck = proj ? checkReadability(proj.description, proj.educationLevel) : { result: 'pass' as const, notes: [] };
  const scopeCheck = proj ? checkScopeAlignment(proj.description, proj.educationLevel, proj.skills) : null;
  const titleResult = grammarCheck.notes.filter(note => /title/i.test(note)).length > 0 ? grammarCheck.result : 'pass';
  const descriptionResult =
    readabilityCheck.result === 'fail' || scopeCheck?.result === 'fail'
      ? 'fail'
      : readabilityCheck.result === 'warn' || scopeCheck?.result === 'warn'
        ? 'warn'
        : 'pass';

  const isDsoCsit = ['DSO', 'CSIT'].includes((proj?.pc || '').trim().toUpperCase());
  const periodStartLabel = periodDisplay(proj?.internshipPeriodStart);
  const periodEndLabel = periodDisplay(proj?.internshipPeriodEnd);
  const periodLabel = periodStartLabel && periodEndLabel
    ? `${periodStartLabel} – ${periodEndLabel}`
    : (periodStartLabel || periodEndLabel || '—');
  const durationLabel = proj?.internshipDuration
    ? `${proj.internshipDuration} Month${proj.internshipDuration === '1' ? '' : 's'}`
    : '—';
  const metaItems = proj && batch ? ([
    { label: 'Project Title', value: proj.title },
    { label: 'Programme Centre', value: proj.pc || batch.pc || '—' },
    { label: 'Intern Category', value: proj.educationLevel || batchEducationLevel(batch, eduMap) || '—' },
    { label: isDsoCsit ? 'Tech Competency (optional)' : 'Tech Competency', value: proj.techDomain || '—' },
    { label: 'Discipline of Study', value: parseDisciplines(proj.discipline).join(' / ') || '—' },
    { label: 'No. of Placements', value: String(proj.slots) },
    { label: 'Project Duration', value: durationLabel },
    { label: 'Internship Window', value: periodLabel },
    { label: 'Primary Mentor Name', value: proj.mentor || '—' },
    { label: 'Primary Mentor Appointment', value: proj.mentorAppointment || '—' },
    { label: 'Primary Mentor Email', value: proj.mentorEmail || proj.mentorUserId || '—' },
    { label: 'Secondary Mentor Name', value: proj.secondaryMentor || '—' },
    { label: 'Secondary Mentor Appointment', value: proj.secondaryMentorAppointment || '—' },
    { label: 'Secondary Mentor Email', value: proj.secondaryMentorEmail || '—' },
  ] as { label: string; value: string }[]) : [];

  const submittedBy = proj?.submittedBy || batch?.submittedBy || 'AD (P&C)';
  const submittedOn = formatDateTime(proj?.submittedAt || batch?.uploadedAt);
  const lastUpdated = formatDateTime(proj?.reviewedAt || proj?.resubmittedAt || proj?.submittedAt || batch?.uploadedAt);
  const versionLabel = `Version ${batch?.id ? (Number(batch.id.split('-').pop()?.slice(-1)) || 2) : 2}`;
  const reviewingLabel = `Reviewing ${versionLabel} · Submitted by ${submittedBy}`;

  const activities = proj ? [
    {
      date: proj.submittedAt
        ? new Date(new Date(proj.submittedAt).getTime() + 2 * 60 * 1000).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—',
      title: 'AI check flagged Project Scope for review',
      actor: 'System',
    },
    {
      date: submittedOn,
      title: `Project submitted by ${submittedBy} (AD (P&C))`,
    },
  ] : [];

  /* ── Sync approved project entries back to requests ──────────────────── */
  function syncProjectsToRequests(updatedBatches: ProjectSubmissionBatch[]) {
    const currentReqs = loadRequests();
    const updated = currentReqs.map((r) => {
      const allProjs = updatedBatches.flatMap(b => b.projects).filter(project => projectMatchesRequest(project, r));
      const submitted = allProjs.filter(p => p.status !== 'rejected' && p.status !== 'withdrawn').reduce((s, p) => s + p.slots, 0);
      const created = allProjs.filter(p => p.status !== 'rejected' && p.status !== 'withdrawn').length;
      return { ...r, uploaded: submitted, created };
    });
    saveRequests(updated);
  }

  /* ── Actions ──────────────────────────────────────────────────────────── */
  function openEdit() { if (canReviewProjects && proj) { setDraft({ ...proj }); setEditOpen(true); } }
  function saveEdit() {
    if (!canReviewProjects) return;
    if (!draft || !proj) return;
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : { ...draft }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    setEditOpen(false);
    showToast('Project details updated.');
  }
  const setD = (patch: Partial<SubmittedProject>) => setDraft(d => d ? { ...d, ...patch } : d);

  function doApprove() {
    if (!canReviewProjects) return;
    if (!proj || !batch) return;
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : { ...p, status: 'approved' as const }),
    });
    setBatches(updated);
    saveSubmissions(updated);

    const projs = loadProjects();
    const nums = projs.map(p => parseInt(p.id.replace(/^PROJ-/, ''), 10)).filter(n => !isNaN(n));
    const newId = `PROJ-${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
    const newProj: ProjectEntry = {
      id: newId, title: proj.title, description: proj.description,
      mentor: proj.mentor, mentorAppointment: proj.mentorAppointment,
      mentorUserId: proj.mentorUserId, mentorBio: proj.mentorBio,
      skills: proj.skills, discipline: proj.discipline,
      slots: proj.slots, matched: 0, status: 'open',
      programme: '', techDomain: proj.techDomain,
      emergingArea: proj.emergingArea, educationLevel: proj.educationLevel,
      internshipDuration: proj.internshipDuration,
      internshipPeriodStart: proj.internshipPeriodStart,
      internshipPeriodEnd: proj.internshipPeriodEnd,
      workingLocation: proj.workingLocation,
    };
    saveProjects([...projs, newProj]);
    syncProjectsToRequests(updated);

    addNotification({ forRole: 'ad-pnc', title: `Project approved — ${proj.title}`, body: `Your project "${proj.title}" (${batchEducationLevel(batch, eduMap)}) has been approved by the IO.`, href: '/submissions', tier: 'info' });
    addNotification({ forRole: 'mentor', ...(proj.mentorUserId ? { forMentorId: proj.mentorUserId } : {}), title: `Your project has been approved — ${proj.title}`, body: `"${proj.title}" has been approved by the IO and is now open for applicants.`, href: '/mentor/projects', tier: 'info' });
    sessionStorage.setItem('dsta_pending_toast', `"${proj.title}" approved and added to Projects.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'pending');
    router.push('/requests');
  }

  function doReturnForUpdate() {
    if (!canReviewProjects) return;
    if (!proj || !returnRemarks.trim()) return;
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : { ...p, status: 'draft' as const, remarks: returnRemarks }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    syncProjectsToRequests(updated);

    addNotification({ forRole: 'ad-pnc', title: `Project returned for update — ${proj.title}`, body: `Your project "${proj.title}" has been returned for update. Reason: ${returnRemarks}`, href: '/submissions', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `"${proj.title}" returned for update.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'pending');
    router.push('/requests');
  }

  function doReject() {
    if (!canReviewProjects) return;
    if (!proj || !rejectRemarks.trim()) return;
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : { ...p, status: 'rejected' as const, remarks: rejectRemarks }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    syncProjectsToRequests(updated);

    addNotification({ forRole: 'ad-pnc', title: `Project rejected — ${proj.title}`, body: `Your project "${proj.title}" has been rejected by the IO. See the rejection remarks for details.`, href: '/submissions', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `"${proj.title}" rejected.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'pending');
    router.push('/requests');
  }

  function doRouteToDce() {
    if (!canReviewProjects) return;
    if (!batch) return;
    const progLabel = batchEducationLevel(batch, eduMap);
    const updated = batches.map(b => b.id !== batch.id ? b : { ...b, dceStatus: 'pending' as const, dceReason: undefined, dceBy: undefined, dceDate: undefined });
    setBatches(updated);
    saveSubmissions(updated);
    logAccess({ actor: profile.name, action: 'decision', detail: `Routed project batch (${progLabel}) to DCE for approval`, subjectId: `batch:${batch.id}` });
    addNotification({ forRole: 'dce', title: `Project batch awaiting approval — ${progLabel}`, body: `The IO has routed a project batch for ${progLabel} (${batch.projects.length} project${batch.projects.length !== 1 ? 's' : ''}) for your approval.`, href: '/dce', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `Batch for ${progLabel} routed to DCE for approval.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'pending');
    router.push('/requests');
  }

  /* ── Loading / not found ──────────────────────────────────────────────── */
  if (batches.length === 0) {
    return (
      <Shell activeRoute="/requests">
        <div className="flex items-center justify-center h-64 text-fg-muted text-body-md">Loading…</div>
      </Shell>
    );
  }

  if (!proj || !batch) {
    return (
      <Shell activeRoute="/requests">
        <div className="flex items-center justify-center h-64 text-fg-muted text-body-md">Project not found.</div>
      </Shell>
    );
  }

  return (
    <Shell activeRoute="/requests">
      {/* Breadcrumb */}
      <nav className="mb-4 flex shrink-0 items-center gap-2 text-label-md">
        <span
          className="cursor-pointer text-fg-muted transition-colors hover:text-accent"
          onClick={() => router.push('/requests')}
        >
          Project Requests
        </span>
        <ChevronRight size={14} className="text-fg-subtle" />
        <span
          className="cursor-pointer text-fg-muted transition-colors hover:text-accent"
          onClick={() => router.push('/requests?tab=submissions')}
        >
          Project Submissions
        </span>
        <ChevronRight size={14} className="text-fg-subtle" />
        <span className="max-w-[420px] truncate font-semibold text-fg">{proj.title}</span>
      </nav>

      {/* Title row */}
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-headline-lg font-bold text-fg">{proj.title}</h1>
          <Badge className={STATUS_COLOURS.pending}>Pending</Badge>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canReviewProjects && (
            <Button variant="outline" size="md" onClick={openEdit}>
              Edit Project
            </Button>
          )}
          <Button variant="outline" size="md" className="px-2.5">
            More
          </Button>
        </div>
      </div>

      <p className="mb-4 text-body-sm text-fg-muted">
        Review the submitted project information, resolve any flagged items, and decide whether the project can proceed.
      </p>

      <AiRecommendationBanner onReview={() => reviewRef.current?.scrollIntoView({ behavior: 'smooth' })} />

      <div className="mt-6">
        <ReviewSummaryCards version={versionLabel} submittedAt={proj.submittedAt || batch.uploadedAt} />
      </div>

      <div className="mt-6 min-h-[calc(100vh-510px)]">
        <UnderlineTabs
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { value: 'review', label: 'Review' },
            { value: 'activity', label: 'Activity' },
          ]}
        />

        {activeTab === 'review' && (
          <div className="mt-4">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-6">
                {/* Education-level mismatch */}
                {levelMismatch && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning-bg px-4 py-3">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
                    <div className="text-body-sm">
                      <p className="font-semibold text-fg">Intern category differs from the request</p>
                      <p className="mt-0.5 text-fg-muted">
                        The request asked for <span className="font-medium text-fg">{requestedLevels.join(', ')}</span>, but this project was submitted as{' '}
                        <span className="font-medium text-fg">{proj.educationLevel}</span>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
                  <div ref={reviewRef}>
                    <ReviewRequiredSection
                      proj={proj}
                      batch={batch}
                      descriptionResult={descriptionResult}
                      readabilityCheck={readabilityCheck}
                      scopeCheck={scopeCheck}
                      canReview={canReviewProjects}
                      onEdit={openEdit}
                    />
                  </div>
                  <div className="my-5 border-t border-border" />
                  <ProjectDetailsSection metaItems={metaItems} />
                </div>
              </div>

              <aside className="space-y-4">
                <SubmissionInformationCard
                  projectId={proj.id}
                  request={`Request from ${batch.pcHead || 'AD (P&C)'}`}
                  submittedBy={submittedBy}
                  submittedOn={submittedOn}
                  lastUpdated={lastUpdated}
                />
                <ReviewChecklistCard
                  requiredFieldsPass
                  scopeNeedsJudgement={descriptionResult !== 'pass'}
                  titleChecked={titleResult === 'pass'}
                />
              </aside>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="mt-4">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <ActivitySection activities={activities} />
              <aside className="space-y-4">
                <SubmissionInformationCard
                  projectId={proj.id}
                  request={`Request from ${batch.pcHead || 'AD (P&C)'}`}
                  submittedBy={submittedBy}
                  submittedOn={submittedOn}
                  lastUpdated={lastUpdated}
                />
              </aside>
            </div>
          </div>
        )}
      </div>

      {canReviewProjects && (
        <BottomActionBar
          reviewingLabel={reviewingLabel}
          onReturn={() => setReturnDialogOpen(true)}
          onReject={() => setRejectDialogOpen(true)}
          onApprove={() => setConfirmApprove(true)}
        />
      )}

      {/* Edit project details (IO) */}
      {canReviewProjects && editOpen && draft && (() => {
        const inputCls = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent';
        const Lbl = ({ children }: { children: React.ReactNode }) => (
          <label className="block text-[12px] font-bold uppercase tracking-wider text-fg-subtle mb-1">{children}</label>
        );
        const Sel = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
          <select className={cn(inputCls, 'cursor-pointer')} value={value} onChange={e => onChange(e.target.value)}>
            <option value="">—</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
        return (
          <Modal open onClose={() => setEditOpen(false)} maxWidth="lg" labelledBy="edit-project-details-title">
            <h2 id="edit-project-details-title" className="text-headline-sm font-bold text-fg mb-1">Edit Project Details</h2>
            <p className="text-body-sm text-fg-muted mb-4">Adjust the project submitted by AD (P&C) before approving.</p>
            <div className="max-h-[64vh] overflow-y-auto pr-1 space-y-4">
              <div>
                <Lbl>Project Title</Lbl>
                <input className={inputCls} value={draft.title} onChange={e => setD({ title: e.target.value })} />
              </div>
              <div>
                <Lbl>Project Scope</Lbl>
                <textarea rows={5} className={cn(inputCls, 'resize-y')} value={draft.description} onChange={e => setD({ description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Lbl>Programme Centre</Lbl><Sel value={draft.pc ?? ''} onChange={v => setD({ pc: v })} options={PC_CODES} /></div>
                <div><Lbl>Intern Category</Lbl><Sel value={draft.educationLevel ?? ''} onChange={v => setD({ educationLevel: toEducationLevel(v) })} options={[...EDUCATION_LEVELS]} /></div>
                <div><Lbl>Tech Competency</Lbl><Sel value={draft.techDomain ?? ''} onChange={v => setD({ techDomain: v })} options={TECH_DOMAINS} /></div>
                <div><Lbl>No. of Placements</Lbl><input type="number" min={1} className={inputCls} value={draft.slots} onChange={e => setD({ slots: Math.max(1, Number(e.target.value) || 1) })} /></div>
              </div>
              <div><Lbl>Discipline of Study</Lbl><Combobox selected={parseDisciplines(draft.discipline)} onToggle={opt => setDraft(d => d ? { ...d, discipline: toggleDiscipline(d.discipline, opt) } : d)} options={DISCIPLINE_OPTIONS} placeholder="Select disciplines…" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Lbl>Internship Window</Lbl>
                  <DateRangePicker
                    start={isoDay(draft.internshipPeriodStart, false)}
                    end={isoDay(draft.internshipPeriodEnd, true)}
                    placeholder="Select start and end date"
                    onChange={(s, e) => setD({ internshipPeriodStart: s, internshipPeriodEnd: e })}
                  />
                </div>
                <div><Lbl>Project Duration</Lbl><Sel value={draft.internshipDuration ?? ''} onChange={v => setD({ internshipDuration: v })} options={DURATION_OPTS} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Lbl>Primary Mentor Name</Lbl><input className={inputCls} value={draft.mentor} onChange={e => setD({ mentor: e.target.value })} /></div>
                <div><Lbl>Primary Mentor Appointment</Lbl><input className={inputCls} value={draft.mentorAppointment ?? ''} onChange={e => setD({ mentorAppointment: e.target.value })} /></div>
                <div><Lbl>Primary Mentor Email</Lbl><input className={inputCls} value={draft.mentorEmail || draft.mentorUserId || ''} onChange={e => setD({ mentorEmail: e.target.value })} placeholder="name@dsta.gov.sg" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Lbl>Secondary Mentor Name</Lbl><input className={inputCls} value={draft.secondaryMentor ?? ''} onChange={e => setD({ secondaryMentor: e.target.value })} placeholder="Optional" /></div>
                <div><Lbl>Secondary Mentor Appointment</Lbl><input className={inputCls} value={draft.secondaryMentorAppointment ?? ''} onChange={e => setD({ secondaryMentorAppointment: e.target.value })} placeholder="Optional" /></div>
                <div><Lbl>Secondary Mentor Email</Lbl><input className={inputCls} value={draft.secondaryMentorEmail ?? ''} onChange={e => setD({ secondaryMentorEmail: e.target.value })} placeholder="Optional" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button disabled={!draft.title.trim() || !draft.description.trim() || !draft.mentor.trim()} onClick={saveEdit}>
                <Check size={14} /> Save Changes
              </Button>
            </div>
          </Modal>
        );
      })()}

      {/* Return for Update dialog */}
      {canReviewProjects && (
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Return Project for Update?</DialogTitle>
              <DialogDescription>
                AD (P&C) will need to revise and resubmit this project before it can be reviewed again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-label-sm text-fg">
                Reason for return <span className="text-danger">*</span>
              </p>
              <textarea
                rows={4}
                autoFocus
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:ring-2 focus:ring-warning/30"
                placeholder="Explain what needs to change..."
                value={returnRemarks}
                onChange={e => setReturnRemarks(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
              <Button disabled={!returnRemarks.trim()} onClick={doReturnForUpdate} className="bg-[rgba(251,44,54,0.1)] text-[#C10007] hover:bg-[rgba(251,44,54,0.15)] border border-[#F8A4A8]">
                Return for Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Project dialog */}
      {canReviewProjects && (
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reject Project?</DialogTitle>
              <DialogDescription>
                This project will not proceed. Add a specific reason for the decision record.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-label-sm text-fg">
                Reason for rejection <span className="text-danger">*</span>
              </p>
              <textarea
                rows={4}
                autoFocus
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:ring-2 focus:ring-danger/30"
                placeholder="Explain why this project is rejected..."
                value={rejectRemarks}
                onChange={e => setRejectRemarks(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="danger" disabled={!rejectRemarks.trim()} onClick={doReject}>
                Reject Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Approve confirmation */}
      {canReviewProjects && (
        <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve project?</DialogTitle>
              <DialogDescription>
                This adds the project to the approved pool as <span className="font-medium text-fg">unassigned</span>. You can attach it to a programme of its intern category later, when creating or editing a programme.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmApprove(false)}>Cancel</Button>
              <Button onClick={() => { setConfirmApprove(false); doApprove(); }}>
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Toast message={toast} />
    </Shell>
  );
}
