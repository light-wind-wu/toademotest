'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import Modal from '@/components/ui-legacy/modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle, Check, ChevronRight,
  X, Pencil, Landmark,
} from 'lucide-react';
import { SUBMISSION_SEED, DEFAULT_PROGRAMMES, PC_CODES, TECH_DOMAINS, EMERGING_AREAS, INTERN_CATEGORIES, EDUCATION_LEVELS, toEducationLevel, progEducationLevelMap, batchEducationLevel } from '@/lib/data';
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
import type { ProjectEntry, ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';

const DURATION_OPTS = ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months', '12 Months'];
const LOCATION_OPTS = ['Hybrid', 'On-Site'];
type ReviewLayout = 'Layout 1' | 'Layout 2';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
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
  const jcCategories  = ['Young Defence Scientist Programme', 'Junior College Scholar/Junior College Student'];
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

function AiCheckHint({
  result,
  notes,
}: {
  result: 'pass' | 'warn' | 'fail';
  notes: string[];
}) {
  const hasIssue = result !== 'pass' || notes.length > 0;
  const effectiveResult = hasIssue ? (result === 'pass' ? 'warn' : result) : 'pass';
  return (
    <div className={cn(
      'mt-3 rounded-lg border px-3 py-2',
      hasIssue ? 'border-warning/30 bg-warning-bg/40' : 'border-border bg-bg-subtle',
    )}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent/10">
          <AiSparkleIcon size={13} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-caption font-semibold text-fg">AI check</p>
            <AiCheckPill result={effectiveResult} label={aiCheckStatusLabel(effectiveResult)} />
          </div>
          {hasIssue ? (
            <ul className="mt-1 space-y-0.5">
              {notes.slice(0, 2).map((note, index) => (
                <li key={index} className="text-caption leading-snug text-fg-muted">{note}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-caption text-fg-muted">Looks clear for applicant-facing use.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewStatusItem({
  label,
  result,
}: {
  label: string;
  result: 'pass' | 'warn' | 'fail';
}) {
  const passed = result === 'pass';
  return (
    <div>
      <p className="text-body-sm font-semibold text-fg">{label}</p>
      <p className={cn(
        'mt-1 inline-flex items-center gap-1.5 text-body-sm font-semibold',
        passed ? 'text-success' : 'text-warning',
      )}>
        {passed ? <Check size={14} /> : <AlertTriangle size={14} />}
        {passed ? 'Passed' : 'Needs review'}
      </p>
    </div>
  );
}

function ReviewStatusSummary({
  titleResult,
  descriptionResult,
  compact = false,
}: {
  titleResult: 'pass' | 'warn' | 'fail';
  descriptionResult: 'pass' | 'warn' | 'fail';
  compact?: boolean;
}) {
  const needsReview = [titleResult, descriptionResult].filter(result => result !== 'pass').length;
  const requiredResult = 'pass' as const;

  if (compact) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning-bg/40 px-4 py-3">
        <div className="grid gap-4 md:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr] md:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="text-body-md font-bold text-fg">
                {needsReview} item{needsReview === 1 ? '' : 's'} needs to review before approval
              </p>
              <p className="mt-0.5 text-body-sm text-fg-muted">Please review the item below</p>
            </div>
          </div>
          <ReviewStatusItem label="Title" result={titleResult} />
          <ReviewStatusItem label="Description" result={descriptionResult} />
          <ReviewStatusItem label="Required fields" result={requiredResult} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-headline-sm text-fg">Review Status</h2>
      <div className="mt-5">
        <p className="text-body-md font-bold text-fg">
          {needsReview} item{needsReview === 1 ? '' : 's'} needs to review before approval
        </p>
        <p className="mt-0.5 text-body-sm text-fg-muted">Please review the item below</p>
      </div>
      <div className="mt-6 space-y-4">
        <ReviewStatusItem label="Title" result={titleResult} />
        <ReviewStatusItem label="Description" result={descriptionResult} />
        <ReviewStatusItem label="Required fields" result={requiredResult} />
      </div>
    </div>
  );
}

function DecisionCard({
  returning,
  remarks,
  setReturning,
  setRemarks,
  doReject,
  doRouteToDce,
  setConfirmApprove,
  dceEnabled,
}: {
  returning: boolean;
  remarks: string;
  setReturning: (value: boolean) => void;
  setRemarks: (value: string) => void;
  doReject: () => void;
  doRouteToDce: () => void;
  setConfirmApprove: (value: boolean) => void;
  dceEnabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-headline-sm text-fg">Decision</h2>
      {returning ? (
        <div className="mt-4">
          <p className="mb-1 text-label-sm text-danger">Rejection Remarks <span className="text-danger">*</span></p>
          <p className="mb-2 text-[13px] text-fg-muted">This will be sent back to the submitter.</p>
          <textarea
            rows={4}
            autoFocus
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg outline-none focus:ring-2 focus:ring-danger/30"
            placeholder="Explain what needs to be changed or improved..."
            value={remarks}
            onChange={event => setRemarks(event.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => { setReturning(false); setRemarks(''); }}>Cancel</Button>
            <Button variant="danger" size="md" disabled={!remarks.trim()} onClick={doReject}>
              <X size={16} />Confirm Rejection
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-body-sm leading-relaxed text-fg-muted">
            Approving adds this project to the approved pool (unassigned). Attach it to a programme later when creating or editing one.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {dceEnabled && (
              <Button variant="outline" size="md" onClick={doRouteToDce}>
                <Landmark size={16} />Route batch to DCE
              </Button>
            )}
            <Button variant="danger" size="md" onClick={() => { setReturning(true); setRemarks(''); }}>
              <X size={16} />Reject Project
            </Button>
            <Button size="md" onClick={() => setConfirmApprove(true)}>
              <Check size={16} />Approve Project
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function RequestReviewDetail() {
  const router = useRouter();
  const params = useParams<{ batchId: string; projId: string }>();
  const batchId = decodeURIComponent(params.batchId ?? '');
  const projId  = decodeURIComponent(params.projId  ?? '');

  const { role, profile } = useRole();
  const dceEnabled = loadDceApprovalEnabled();
  const canReviewProjects = role === 'io' || role === 'io-admin';
  const { toast, showToast } = useToast();

  const [batches, setBatches] = useState<ProjectSubmissionBatch[]>([]);
  const [returning, setReturning] = useState(false);
  const [remarks,   setRemarks]   = useState('');
  const [editOpen,          setEditOpen]           = useState(false);
  const [draft,             setDraft]              = useState<SubmittedProject | null>(null);
  const [reviewLayout,      setReviewLayout]       = useState<ReviewLayout>('Layout 1');

  const progMap = Object.fromEntries(DEFAULT_PROGRAMMES.map(p => [p.id, p.title]));
  const eduMap  = progEducationLevelMap();

  useEffect(() => {
    const data = loadSubmissions();
    setBatches(data.length > 0 ? data : SUBMISSION_SEED);
  }, []);

  /* ── Derived ──────────────────────────────────────────────────────────── */
  const batch      = batches.find(b => b.id === batchId) ?? null;
  const proj       = batch?.projects.find(p => p.id === projId) ?? null;
  // AD (P&C) can answer a request with a different intern category than was asked for.
  // Surface that to the IO so they approve knowing the level differs from the request.
  const requestedLevels = batch?.requestedEducationLevels ?? [];
  const levelMismatch = !!proj?.educationLevel && requestedLevels.length > 0 && !requestedLevels.includes(proj.educationLevel);
  const grammarCheck     = proj ? checkGrammarTone(proj.title, proj.description)                        : { result: 'pass' as const, notes: [] };
  const readabilityCheck = proj ? checkReadability(proj.description, proj.educationLevel)               : { result: 'pass' as const, notes: [] };
  const scopeCheck       = proj ? checkScopeAlignment(proj.description, proj.educationLevel, proj.skills) : null;
  const titleResult = grammarCheck.notes.filter(note => /title/i.test(note)).length > 0 ? grammarCheck.result : 'pass';
  const descriptionResult =
    readabilityCheck.result === 'fail' || scopeCheck?.result === 'fail'
      ? 'fail'
      : readabilityCheck.result === 'warn' || scopeCheck?.result === 'warn'
        ? 'warn'
        : 'pass';

  // Project Details grid — the tabular columns from the DSTA Project Request
  // template (Project Title / Scope render separately as cards above).
  // Tech Competency is optional when the Programme Centre is DSO or CSIT; the
  // secondary-mentor columns are always optional (shown as — when blank).
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
    { label: 'Programme Centre',       value: proj.pc || batch.pc || '—' },
    { label: 'Intern Category',        value: proj.educationLevel || batchEducationLevel(batch, eduMap) || '—' },
    { label: isDsoCsit ? 'Tech Competency (optional)' : 'Tech Competency', value: proj.techDomain || '—' },
    { label: 'Discipline of Study',    value: parseDisciplines(proj.discipline).join(' / ') || '—' },
    { label: 'No. of Placements',      value: String(proj.slots) },
    { label: 'Internship Window',      value: periodLabel },
    { label: 'Project Duration',       value: durationLabel },
    { label: 'Primary Mentor Name',        value: proj.mentor || '—' },
    { label: 'Primary Mentor Appointment', value: proj.mentorAppointment || '—' },
    { label: 'Primary Mentor Email',       value: proj.mentorEmail || proj.mentorUserId || '—' },
    { label: 'Secondary Mentor Name',        value: proj.secondaryMentor || '—' },
    { label: 'Secondary Mentor Appointment', value: proj.secondaryMentorAppointment || '—' },
    { label: 'Secondary Mentor Email',       value: proj.secondaryMentorEmail || '—' },
  ] as { label: string; value: string }[]) : [];

  /* ── Sync approved project entries back to requests ──────────────────── */
  function syncProjectsToRequests(updatedBatches: ProjectSubmissionBatch[]) {
    const currentReqs = loadRequests();
    const updated = currentReqs.map((r) => {
      const allProjs  = updatedBatches.flatMap(b => b.projects).filter(project => projectMatchesRequest(project, r));
      const submitted = allProjs.filter(p => p.status !== 'rejected' && p.status !== 'withdrawn').reduce((s, p) => s + p.slots, 0);
      const created   = allProjs.filter(p => p.status !== 'rejected' && p.status !== 'withdrawn').length;
      return { ...r, uploaded: submitted, created };
    });
    saveRequests(updated);
  }

  /* ── Actions ──────────────────────────────────────────────────────────── */
  /* ── IO edits the submitted project details ───────────────────────────── */
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

  const [confirmApprove, setConfirmApprove] = useState(false);

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
    const nums  = projs.map(p => parseInt(p.id.replace(/^PROJ-/, ''), 10)).filter(n => !isNaN(n));
    const newId = `PROJ-${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
    const newProj: ProjectEntry = {
      id: newId, title: proj.title, description: proj.description,
      mentor: proj.mentor, mentorAppointment: proj.mentorAppointment,
      mentorUserId: proj.mentorUserId, mentorBio: proj.mentorBio,
      skills: proj.skills, discipline: proj.discipline,
      slots: proj.slots, matched: 0, status: 'open',
      programme: '', techDomain: proj.techDomain,  // approved → unassigned; an IO attaches it to a programme later
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

  function doReject() {
    if (!canReviewProjects) return;
    if (!proj || !remarks.trim()) return;
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : { ...p, status: 'rejected' as const, remarks }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    syncProjectsToRequests(updated);

    addNotification({ forRole: 'ad-pnc', title: `Project rejected — ${proj.title}`, body: `Your project "${proj.title}" has been rejected by the IO. See the rejection remarks for details.`, href: '/submissions', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `"${proj.title}" rejected.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'pending');
    router.push('/requests');
  }

  // SCI flow (DCE approval ON) — IO routes the whole reviewed batch to the DCE for sign-off
  // instead of finalising it here. (Stub ahead of the design pass; wired to the DCE substrate.)
  // Persists via the component's batch state — like doApprove/doReject — so it stays in sync
  // even when the list was loaded from the seed fallback.
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
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-headline-lg font-bold text-fg">{proj.title}</h1>
          <span className="badge bg-warning-bg text-warning">Pending Review</span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={reviewLayout} onValueChange={value => setReviewLayout(value as ReviewLayout)}>
            <SelectTrigger className="h-9 w-[132px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Layout 1">Layout 1</SelectItem>
              <SelectItem value="Layout 2">Layout 2</SelectItem>
            </SelectContent>
          </Select>
          {canReviewProjects && (
            <Button variant="outline" size="md" onClick={openEdit}>
              <Pencil size={16} />Edit Details
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        reviewLayout === 'Layout 1'
          ? 'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'
          : 'space-y-6',
      )}>
        <div className="space-y-6">
          {reviewLayout === 'Layout 2' && (
            <ReviewStatusSummary titleResult={titleResult} descriptionResult={descriptionResult} compact />
          )}

          {/* Education-level mismatch — AD (P&C) answered with a different level than requested */}
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

          {/* Title and description */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-label-sm text-fg-muted mb-2">Project Title</p>
                <p className="text-body-md text-fg font-medium leading-snug">{proj.title}</p>
              </div>
              <AiCheckPill result={titleResult} label={titleResult === 'pass' ? 'Passed' : 'Needs review'} />
            </div>
            {canReviewProjects && (
              <AiCheckHint result={grammarCheck.result} notes={grammarCheck.notes.filter(note => /title/i.test(note))} />
            )}

            <div className="my-5 border-t border-border" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-label-sm text-fg-muted mb-3">Project Scope</p>
                <p className="text-body-md text-fg leading-relaxed">{proj.description}</p>
              </div>
              <AiCheckPill result={descriptionResult} label={descriptionResult === 'pass' ? 'Passed' : 'Needs review'} />
            </div>
            {canReviewProjects && (
              <AiCheckHint
                result={descriptionResult}
                notes={[...readabilityCheck.notes, ...(scopeCheck?.notes ?? [])]}
              />
            )}
          </div>

          {/* Project metadata */}
          <div className="card p-5">
            <p className="text-label-sm text-fg-muted mb-4">Project Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              {metaItems.map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-fg-subtle mb-0.5">{label}</p>
                  <p className="text-body-sm text-fg">{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {reviewLayout === 'Layout 1' && canReviewProjects && (
          <aside className="sticky top-6 space-y-4">
            <ReviewStatusSummary titleResult={titleResult} descriptionResult={descriptionResult} />
            <DecisionCard
              returning={returning}
              remarks={remarks}
              setReturning={setReturning}
              setRemarks={setRemarks}
              doReject={doReject}
              doRouteToDce={doRouteToDce}
              setConfirmApprove={setConfirmApprove}
              dceEnabled={dceEnabled}
            />
          </aside>
        )}
      </div>

      {/* Sticky action bar — stays in view while scrolling the review */}
      {canReviewProjects && reviewLayout === 'Layout 2' && (
      <div className="sticky bottom-4 z-20 mt-6">
        {returning && (
          <div className="mb-3">
            <p className="text-label-sm text-danger mb-1">Rejection Remarks <span className="text-danger">*</span></p>
            <p className="text-[13px] text-fg-muted mb-2">This will be sent back to the submitter.</p>
            <textarea
              rows={3}
              autoFocus
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-danger/30"
              placeholder="Explain what needs to be changed or improved…"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-center justify-end gap-2.5">
          {returning ? (
            <>
              <Button variant="ghost" onClick={() => { setReturning(false); setRemarks(''); }}>
                Cancel
              </Button>
              <Button variant="danger" disabled={!remarks.trim()} onClick={doReject}>
                <X size={15} />Confirm Rejection
              </Button>
            </>
          ) : (
            <>
              <p className="mr-auto text-body-sm text-fg-muted min-w-0">
                Approving adds this project to the approved pool (unassigned). Attach it to a programme later when creating or editing one.
              </p>
              {dceEnabled && (
                <Button variant="outline" onClick={doRouteToDce}>
                  <Landmark size={15} />Route batch to DCE
                </Button>
              )}
              <Button variant="danger" onClick={() => { setReturning(true); setRemarks(''); }}>
                <X size={15} />Reject Project
              </Button>
              <Button onClick={() => setConfirmApprove(true)}>
                <Check size={15} />Approve Project
              </Button>
            </>
          )}
        </div>
      </div>
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
              <Button disabled={!draft.title.trim() || !draft.description.trim() || !draft.mentor.trim()} onClick={saveEdit}>
                <Check size={14} /> Save Changes
              </Button>
              <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </Modal>
        );
      })()}

      {canReviewProjects && (
      <Modal open={confirmApprove} onClose={() => setConfirmApprove(false)} labelledBy="approve-project-title">
        <h2 id="approve-project-title" className="text-headline-sm font-bold text-fg mb-1">Approve project?</h2>
        <p className="text-body-sm text-fg-muted mb-5">
          This adds the project to the approved pool as <span className="font-medium text-fg">unassigned</span>. You can attach it to a programme of its intern category later, when creating or editing a programme.
        </p>
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { setConfirmApprove(false); doApprove(); }}>
            <Check size={14} /> Confirm Approval
          </Button>
          <Button variant="ghost" onClick={() => setConfirmApprove(false)}>Cancel</Button>
        </div>
      </Modal>
      )}

      <Toast message={toast} />
    </Shell>
  );
}
