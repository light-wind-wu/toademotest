'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import {
  ChevronRight, ChevronDown, Check, X, AlertTriangle, CheckCircle2,
  Brain, Wrench, BookOpen, Clock, MapPin, Users,
  GraduationCap, User, Building2, Rocket, Briefcase, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { progEducationLevelMap, batchEducationLevel } from '@/lib/data';
import { loadSubmissions, saveSubmissions, loadProjects, saveProjects } from '@/lib/storage';
import { useProgramme } from '@/lib/programme-context';
import { addNotification } from '@/lib/notifications';
import { useRole } from '@/lib/role';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import type { ProjectSubmissionBatch, SubmittedProject, ProjectEntry } from '@/lib/types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── AI check: scope-category alignment ──────────────────────────────────── */
function checkScopeAlignment(
  description: string,
  category?: string,
  skills?: string[],
): { result: 'pass' | 'warn' | 'fail'; notes: string[] } {
  const notes: string[] = [];
  const lower       = description.toLowerCase();
  const wordCount   = lower.split(/\s+/).filter(Boolean).length;

  if (wordCount < 25) {
    return {
      result: 'fail',
      notes: ['Project scope is too brief to assess category alignment. Expand to at least 30–50 words covering the intern\'s tasks, learning outcomes, and expected deliverables.'],
    };
  }

  const internFacing = /\b(intern|you will|you will|student|applicant|you'll|candidate|participant)\b/i.test(description);
  if (!internFacing) {
    notes.push('Scope does not directly address the intern. Rewrite using intern-facing language (e.g., "Interns will…", "You will…").');
  }

  const hasDeliverables = /\b(deliver|report|prototype|model|system|tool|dashboard|analysis|present|produce|build|develop|implement|document|code|paper)\b/i.test(description);
  if (!hasDeliverables) {
    notes.push('No expected deliverables identified. State what the intern will produce or present at the end of the internship.');
  }

  const jcCategories   = ['Young Defence Scientist Programme', 'Junior College Scholar/Junior College Student'];
  const advancedTerms  = /\b(stochastic|heterogeneous|eigenvalue|bayesian inference|markov chain|convex optimization|fourier transform|propagation matrix|differential equation|tensor decomposition|backpropagation|variational inference)\b/i;
  if (category && jcCategories.includes(category) && advancedTerms.test(description)) {
    notes.push(`Category "${category}" targets pre-university students. Advanced technical terminology was detected — simplify the language to suit this audience.`);
  }

  if (skills && skills.length > 0) {
    const mentioned = skills.filter(s => lower.includes(s.toLowerCase()));
    if (mentioned.length === 0) {
      notes.push('None of the required skills appear in the project scope. Ensure the scope reflects how listed skills will be applied or developed.');
    }
  }

  return { result: notes.length === 0 ? 'pass' : 'warn', notes };
}

/* ── Client-side AI suggestion generation ─────────────────────────────────── */
function mockSuggestTitle(title: string): string {
  // Strip redundant filler words
  let t = title.trim()
    .replace(/\b(project|internship|intern)\b/gi, '')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Title-case, leaving short prepositions lowercase
  const stop = new Set(['a','an','the','and','but','or','for','in','on','at','to','of','with','by','via']);
  t = t.split(' ')
    .map((w, i) => (!stop.has(w.toLowerCase()) || i === 0)
      ? w.charAt(0).toUpperCase() + w.slice(1)
      : w.toLowerCase())
    .join(' ');

  // If nothing changed, append a domain-aware qualifier
  if (t.toLowerCase() === title.toLowerCase().trim()) {
    if (/quantum|crypto|cipher|secur|cyber/i.test(t))   return `${t}: Applied Security Research`;
    if (/machine.learn|deep.learn|neural|nlp|llm|ai\b/i.test(t)) return `${t}: Applied ML Research`;
    if (/data|analytic|visuali|dashb/i.test(t))          return `${t}: Data & Analytics`;
    if (/software|engineer|develop|system/i.test(t))     return `${t}: Software Engineering`;
    return `${t}: Research & Development`;
  }
  return t;
}

function mockSuggestScope(description: string, skills: string[]): string {
  // Normalise — split on sentence boundaries
  const raw = description.trim().replace(/\s+/g, ' ');
  const sentences = raw
    .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  // Make each sentence intern-facing
  const rewritten = sentences.map(s => {
    let t = s;
    t = t.replace(/\bThe intern(s)?\b/gi,        'You');
    t = t.replace(/\bIntern(s)?\b/g,              'You');
    t = t.replace(/\bStudent(s)?\b/gi,            'You');
    t = t.replace(/\bCandidate(s)?\b/gi,          'You');
    t = t.replace(/\bwill be expected to\b/gi,    'will');
    t = t.replace(/\bwill be required to\b/gi,    'will');
    t = t.replace(/\bshould\b/g,                  'will');
    t = t.replace(/\bhe\/she\b/gi,                'you');
    t = t.replace(/\bhe or she\b/gi,              'you');
    t = t.replace(/\bthey\b/g,                    'you');
    return t;
  });

  // Ensure the whole thing opens with intern-facing language
  if (rewritten.length > 0 && !/^(you |as an intern)/i.test(rewritten[0])) {
    const first = rewritten[0];
    rewritten[0] = `You will ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
  }

  // Prepend a framing sentence
  const opening = 'As part of DSTA\'s internship programme, you will gain hands-on exposure in a real-world research and engineering environment.';

  // Append a deliverables sentence if none detected
  const body = rewritten.join(' ');
  const hasDeliverable = /\b(deliver|report|prototype|submit|present|produce|demonstrate|showcase)\b/i.test(body);
  const skillPhrase = skills.length > 0
    ? skills.slice(0, 2).join(' and ')
    : 'your acquired technical skills';
  const closing = hasDeliverable ? '' :
    ` At the end of the internship, you will present your findings and submit a structured report demonstrating applied ${skillPhrase}.`;

  return `${opening} ${body}${closing}`.replace(/\s{2,}/g, ' ').trim();
}

/* ── Partition aiCheck notes heuristically ────────────────────────────────── */
function partitionNotes(notes: string[]): { grammar: string[]; level: string[] } {
  const grammar: string[] = [];
  const level:   string[] = [];
  for (const n of notes) {
    const l = n.toLowerCase();
    if (
      l.includes('capital') || l.includes('sentence') || l.includes('brief') ||
      l.includes('word') || l.includes('professional') || l.includes('grammar') ||
      l.includes('title') || l.includes('full stop') || l.includes('article') ||
      l.includes('deliverable') || l.includes('intern-facing') || l.includes('language') ||
      l.includes('tone') || l.includes('address the intern')
    ) {
      grammar.push(n);
    } else {
      level.push(n);
    }
  }
  return { grammar, level };
}

/* ── AI Check row ─────────────────────────────────────────────────────────── */
function aiStatusLabel(result: 'pass' | 'warn' | 'fail') {
  if (result === 'pass') return 'Passed';
  if (result === 'fail') return 'Must fix';
  return 'Needs review';
}

function AiCheckRow({ label, result, notes, last = false }: {
  label: string;
  result: 'pass' | 'warn' | 'fail';
  notes: string[];
  last?: boolean;
}) {
  const { Icon, chipCls, chipLabel, iconCls } =
    result === 'pass' ? { Icon: CheckCircle2, chipCls: 'bg-success-bg text-success border-success/20',   chipLabel: aiStatusLabel(result), iconCls: 'text-success' } :
    result === 'warn' ? { Icon: AlertTriangle, chipCls: 'bg-warning-bg text-warning border-warning/20', chipLabel: aiStatusLabel(result), iconCls: 'text-warning' } :
                        { Icon: X,             chipCls: 'bg-danger-bg text-danger border-danger/20',     chipLabel: aiStatusLabel(result), iconCls: 'text-danger'  };
  return (
    <div className={cn('flex gap-4 py-4', !last && 'border-b border-border')}>
      <Icon size={18} className={cn('mt-0.5 shrink-0', iconCls)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-body-sm font-semibold text-fg">{label}</p>
          <span className={cn('text-[12px] font-bold px-2 py-0.5 rounded-full border', chipCls)}>{chipLabel}</span>
        </div>
        {notes.length > 0 ? (
          <ul className="space-y-1.5">
            {notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-fg-muted leading-snug">
                <span className="w-1 h-1 rounded-full bg-fg-muted mt-1.5 shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-fg-muted">No issues detected.</p>
        )}
      </div>
    </div>
  );
}

/* ── Detail row (re-used from project-detail style) ───────────────────────── */
function DetailRow({ label, value }: {
  icon?: React.ElementType; label: string; value?: string | string[];
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return (
    <div>
      <p className="text-caption text-fg-muted mb-1">{label}</p>
      {Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map(v => (
            <span key={v} className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-bg-subtle border border-border text-fg">{v}</span>
          ))}
        </div>
      ) : (
        <p className="text-body-md text-fg">{value}</p>
      )}
    </div>
  );
}

/* ── Section divider ──────────────────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[12px] font-black text-fg-subtle uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  );
}

/* ── Status meta ──────────────────────────────────────────────────────────── */
const REVIEW_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:           { label: 'Pending Review',       cls: 'bg-warning-bg text-warning'  },
  approved:          { label: 'Approved',             cls: 'bg-success-bg text-success'  },
  returnedForUpdate: { label: 'Returned for Update',  cls: 'bg-danger-bg text-danger'    },
  rejected:          { label: 'Rejected',             cls: 'bg-danger-bg text-danger'    },
  withdrawn:         { label: 'Withdrawn',           cls: 'bg-bg-muted text-fg-muted'   },
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function SubmissionReviewPage() {
  const router   = useRouter();
  const { role } = useRole();
  const { progOpts } = useProgramme();
  const progMap  = Object.fromEntries(progOpts.map(p => [p.value, p.label]));
  const eduMap   = progEducationLevelMap();
  const { toast, showToast } = useToast();

  const [batchId,    setBatchId]    = useState('');
  const [projectId,  setProjectId]  = useState('');
  const [batches,    setBatches]    = useState<ProjectSubmissionBatch[]>([]);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejectOpen,     setRejectOpen]     = useState(false);
  const [rejectRemarks,  setRejectRemarks]  = useState('');
  const [titleDraft,        setTitleDraft]        = useState('');
  const [scopeDraft,        setScopeDraft]        = useState('');
  const [aiDrawerOpen,      setAiDrawerOpen]      = useState(false);
  const [showOriginalTitle, setShowOriginalTitle] = useState(false);
  const [showOriginalScope, setShowOriginalScope] = useState(false);

  useEffect(() => {
    if (role !== 'io-admin') { router.replace('/requests'); return; }
    try {
      const refRaw = localStorage.getItem('dsta_sub_review_view');
      if (!refRaw) { router.replace('/requests'); return; }
      const { batchId: bid, projectId: pid } = JSON.parse(refRaw);
      setBatchId(bid); setProjectId(pid);
      setBatches(loadSubmissions());
    } catch { router.replace('/requests'); }
  }, [role, router]);

  const batch   = useMemo(() => batches.find(b => b.id === batchId),                      [batches, batchId]);
  const project = useMemo(() => batch?.projects.find(p => p.id === projectId) ?? null,    [batch, projectId]);

  useEffect(() => {
    if (project) {
      setTitleDraft(project.aiCheck.suggestedTitle ?? '');
      setScopeDraft(project.aiCheck.suggestedScope  ?? '');
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopeCheck    = useMemo(() => project ? checkScopeAlignment(project.description, project.educationLevel, project.skills) : null, [project]);
  const noteGroups    = useMemo(() => project ? partitionNotes(project.aiCheck.notes) : { grammar: [], level: [] }, [project]);
  const aiIssueCount  = project ? [project.aiCheck.grammar, project.aiCheck.level, scopeCheck?.result ?? 'pass'].filter(r => r !== 'pass').length : 0;

  /* ── Apply / restore AI suggestion ───────────────────────────────────── */
  function applyAiTitle() {
    if (!batch || !project || !titleDraft.trim()) return;
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : {
        ...p,
        title: titleDraft.trim(),
        originalTitle: p.originalTitle ?? p.title,
        aiCheck: { ...p.aiCheck, suggestedTitle: undefined },
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    showToast('AI-suggested title applied.');
  }

  function restoreOriginalTitle() {
    if (!batch || !project?.originalTitle) return;
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : {
        ...p, title: p.originalTitle!, originalTitle: undefined,
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    setTitleDraft(project.aiCheck.suggestedTitle ?? '');
    setShowOriginalTitle(false);
    showToast('Original title restored.');
  }

  function applyAiScope() {
    if (!batch || !project || !scopeDraft.trim()) return;
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : {
        ...p,
        description: scopeDraft.trim(),
        originalDescription: p.originalDescription ?? p.description,
        aiCheck: { ...p.aiCheck, suggestedScope: undefined },
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    showToast('AI-suggested scope applied.');
  }

  function rerunAi() {
    if (!batch || !project) return;
    const suggestedTitle = mockSuggestTitle(project.title);
    const suggestedScope = mockSuggestScope(project.description, project.skills ?? []);
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : {
        ...p,
        aiCheck: { ...p.aiCheck, suggestedTitle, suggestedScope },
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    setTitleDraft(suggestedTitle);
    setScopeDraft(suggestedScope);
    setAiDrawerOpen(false);
    showToast('AI assessment refreshed.');
  }

  function restoreOriginalScope() {
    if (!batch || !project?.originalDescription) return;
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : {
        ...p, description: p.originalDescription!, originalDescription: undefined,
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    setScopeDraft(project.aiCheck.suggestedScope ?? '');
    setShowOriginalScope(false);
    showToast('Original scope restored.');
  }

  /* ── Approve ──────────────────────────────────────────────────────────── */
  function doApprove() {
    if (!batch || !project) return;
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : { ...p, status: 'approved' as const }),
    });
    saveSubmissions(updated);

    const projs = loadProjects();
    const projNums = projs.map(p => parseInt(p.id.replace(/^PROJ-/, ''), 10)).filter(n => !isNaN(n));
    // Also avoid any PROJ id still referenced by existing applications, so a newly
    // approved project never inherits stale applicants from a removed/old project.
    let appNums: number[] = [];
    try {
      const rawApps = localStorage.getItem('dsta_applications');
      const apps: { shortlistedFor?: string; projectRankings?: string[]; suitabilityScores?: { projectId?: string }[] }[] =
        rawApps ? JSON.parse(rawApps) : [];
      const refs = apps.flatMap(a => [
        a.shortlistedFor,
        ...(a.projectRankings ?? []),
        ...((a.suitabilityScores ?? []).map(s => s.projectId)),
      ]);
      appNums = refs.filter((id): id is string => !!id).map(id => parseInt(id.replace(/^PROJ-/, ''), 10)).filter(n => !isNaN(n));
    } catch {}
    const maxNum = Math.max(0, ...projNums, ...appNums);
    const newId = `PROJ-${String(maxNum + 1).padStart(4, '0')}`;
    {
      const newProj: ProjectEntry = {
        id:          newId,
        title:       project.title,
        description: project.description,
        mentor:               project.mentor,
        mentorAppointment:    project.mentorAppointment,
        mentorUserId:         project.mentorUserId,
        mentorBio:   project.mentorBio,
        skills:      project.skills,
        discipline:  project.discipline,
        slots:       project.slots,
        matched:     0,
        status:      'open',
        programme:   '',   // unassigned — an IO attaches this project to a programme of its Intern Category
        pc:                 project.pc,
        techDomain:         project.techDomain,
        emergingArea:       project.emergingArea,
        educationLevel:     project.educationLevel,
        internshipDuration: project.internshipDuration,
        internshipPeriodStart: project.internshipPeriodStart,
        internshipPeriodEnd:   project.internshipPeriodEnd,
        workingLocation:    project.workingLocation,
      };
      saveProjects([...projs, newProj]);
    }
    const approvedLevel = batch.educationLevel ?? project.educationLevel ?? '';
    addNotification({ forRole: 'ad-pnc', title: `Project approved — ${project.title}`, body: `Your project "${project.title}" (${approvedLevel}) has been approved by the IO.`, href: '/submissions', tier: 'info' });
    addNotification({ forRole: 'mentor', ...(project.mentorUserId ? { forMentorId: project.mentorUserId } : {}), title: `Your project has been approved — ${project.title}`, body: `"${project.title}" has been approved by the IO and is now open for applicants.`, href: '/mentor/projects', tier: 'info' });
    sessionStorage.setItem('dsta_pending_toast', `"${project.title}" approved and added to Projects.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'approved');
    router.push('/requests');
  }

  /* ── Reject (terminal — carries a remark for AD P&C) ──────────────────── */
  function doReject() {
    if (!batch || !project) return;
    const updated = batches.map(b => b.id !== batch.id ? b : {
      ...b, projects: b.projects.map(p => p.id !== project.id ? p : { ...p, status: 'rejected' as const, remarks: rejectRemarks }),
    });
    saveSubmissions(updated);
    addNotification({ forRole: 'ad-pnc', title: `Project rejected — ${project.title}`, body: `Your project "${project.title}" has been rejected by the IO. See the rejection remarks for details.`, href: '/submissions', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `"${project.title}" rejected.`);
    sessionStorage.setItem('dsta_requests_target_tab', 'rejected');
    router.push('/requests');
  }

  if (role !== 'io-admin') return null;

  if (!project || !batch) {
    return (
      <Shell activeRoute="/requests">
        <div className="flex items-center justify-center py-32">
          <p className="text-body-lg text-fg-muted">Loading submission…</p>
        </div>
      </Shell>
    );
  }

  const meta = REVIEW_STATUS_META[project.status] ?? REVIEW_STATUS_META.pending;

  return (
    <Shell activeRoute="/requests">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-4 text-label-md flex-wrap">
        <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => { sessionStorage.setItem('dsta_requests_target_tab', project.status === 'frozen' ? 'pendingDce' : 'pending'); router.push('/requests'); }}>Requests</span>
        <ChevronRight size={16} className="text-fg-subtle" />
        <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => { sessionStorage.setItem('dsta_requests_target_tab', project.status === 'frozen' ? 'pendingDce' : 'pending'); router.push('/requests'); }}>Submissions</span>
        <ChevronRight size={16} className="text-fg-subtle" />
        <span className="text-fg truncate max-w-[300px]">{project.title}</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start mb-2 gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <h1 className="text-headline-lg text-fg">{project.title}</h1>
            <span className={cn('text-caption-bold px-2.5 py-1 rounded-full', meta.cls)}>{meta.label}</span>
          </div>
          <p className="text-body-md text-fg-muted">{project.mentor} · {batchEducationLevel(batch, eduMap)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiDrawerOpen(true)}
            className={cn(aiIssueCount > 0 && 'border-warning/40 text-warning hover:bg-warning-bg')}
          >
            <AiSparkleIcon size={14} />AI Checks
            {aiIssueCount > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full bg-warning text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                {aiIssueCount}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { sessionStorage.setItem('dsta_requests_target_tab', project.status === 'frozen' ? 'pendingDce' : 'pending'); router.push('/requests'); }}>Back</Button>
        </div>
      </div>

      {/* AI suggested title */}
      {project.aiCheck.suggestedTitle && (
        <div className="mt-3 mb-2 border-l-2 border-accent/40 pl-4 py-0.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AiSparkleIcon size={11} />
            <p className="text-[12px] font-black text-accent uppercase tracking-widest">AI Suggested Title</p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              className="flex-1 border border-accent/30 rounded-lg px-3 py-1.5 text-body-sm bg-accent/5 text-fg outline-none focus:ring-1 focus:border-accent focus:ring-accent/20"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={applyAiTitle}
              disabled={!titleDraft.trim() || titleDraft.trim() === project.title}
            >
              <Check size={13} />Apply
            </Button>
          </div>
        </div>
      )}
      {/* Original title — persists after AI bubble is dismissed */}
      {project.originalTitle && (
        <div className="mb-5 mt-2">
          <button
            onClick={() => setShowOriginalTitle(v => !v)}
            className="flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg transition-colors"
          >
            <ChevronDown size={12} className={cn('transition-transform', showOriginalTitle && 'rotate-180')} />
            Original submission by AD(P&C)
          </button>
          {showOriginalTitle && (
            <div className="mt-1.5 flex items-center gap-3 pl-4">
              <p className="text-body-sm text-fg-muted italic flex-1">{project.originalTitle}</p>
              <button
                onClick={restoreOriginalTitle}
                className="text-[13px] text-fg-muted hover:text-danger transition-colors whitespace-nowrap shrink-0"
              >
                Restore original
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Project Details */}
          <div className="card p-6">
            <h2 className="text-headline-md text-fg mb-5">Project Details</h2>

            <SectionDivider label="Project Scope" />
            <p className="text-body-md text-fg leading-relaxed mt-3 mb-2">{project.description}</p>
            {project.originalDescription && (
              <div className="mb-4">
                <button
                  onClick={() => setShowOriginalScope(v => !v)}
                  className="flex items-center gap-1 text-[13px] text-fg-muted hover:text-fg transition-colors"
                >
                  <ChevronDown size={12} className={cn('transition-transform', showOriginalScope && 'rotate-180')} />
                  Original submission by AD(P&C)
                </button>
                {showOriginalScope && (
                  <div className="mt-2 pl-4 border-l-2 border-border">
                    <p className="text-body-sm text-fg-muted italic leading-relaxed">{project.originalDescription}</p>
                    <button
                      onClick={restoreOriginalScope}
                      className="mt-1.5 text-[13px] text-fg-muted hover:text-danger transition-colors"
                    >
                      Restore original
                    </button>
                  </div>
                )}
              </div>
            )}

            {project.aiCheck.suggestedScope && (
              <div className="mb-6 border-l-2 border-accent/40 pl-4 py-0.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Wand2 size={11} className="text-accent" />
                  <p className="text-[12px] font-black text-accent uppercase tracking-widest">AI Suggested Scope</p>
                  <span className="text-[12px] text-fg-subtle ml-1">— edit as needed, then apply</span>
                </div>
                <textarea
                  value={scopeDraft}
                  onChange={e => setScopeDraft(e.target.value)}
                  rows={11}
                  className="w-full border border-accent/30 rounded-lg px-3 py-2 text-body-sm bg-accent/5 text-fg outline-none focus:ring-1 focus:border-accent focus:ring-accent/20 resize-y"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyAiScope}
                    disabled={!scopeDraft.trim() || scopeDraft.trim() === project.description}
                  >
                    <Check size={13} />Apply Scope
                  </Button>
                </div>
              </div>
            )}

            {(project.techDomain || project.emergingArea || project.educationLevel || project.discipline) && (
              <>
                <SectionDivider label="Classification" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-4 mb-6">
                  {project.educationLevel && <DetailRow icon={GraduationCap} label="Intern Category" value={project.educationLevel} />}
                  {project.techDomain     && <DetailRow icon={Brain}         label="Tech Domain"         value={project.techDomain}     />}
                  {project.emergingArea   && <DetailRow icon={Rocket}        label="Emerging Area"       value={project.emergingArea}   />}
                </div>
              </>
            )}

            {(project.discipline || (project.skills && project.skills.length > 0)) && (
              <>
                <SectionDivider label="Academic Requirements" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-4 mb-6">
                  {project.discipline && <DetailRow icon={BookOpen} label="Discipline of Study"         value={project.discipline} />}
                  {project.skills && project.skills.length > 0 && <DetailRow icon={Wrench} label="Skills / Knowledge Required" value={project.skills} />}
                </div>
              </>
            )}

            {(project.slots || project.internshipDuration || project.workingLocation) && (
              <>
                <SectionDivider label="Logistics" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-4">
                  <DetailRow icon={Users}   label="No. of Placements"  value={String(project.slots)} />
                  {project.internshipDuration && <DetailRow icon={Clock}  label="Internship Duration" value={project.internshipDuration} />}
                  {project.workingLocation    && <DetailRow icon={MapPin} label="Working Location"    value={project.workingLocation}    />}
                </div>
              </>
            )}
          </div>

          {/* Mentor Information */}
          <div className="card p-6">
            <h2 className="text-headline-md text-fg mb-5">Mentor Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <DetailRow icon={User}      label="Full Name of Main Mentor"  value={project.mentor}              />
              {project.mentorAppointment   && <DetailRow icon={Briefcase} label="Main Mentor Appointment" value={project.mentorAppointment}   />}
              {project.mentorUserId        && <DetailRow label="Main Mentor Email"          value={project.mentorUserId}        />}
              <DetailRow icon={Building2} label="Department"                value={project.mentorDept}             />
            </div>
            {project.mentorBio && (
              <>
                <div className="border-t border-border my-5" />
                <p className="text-caption text-fg-muted mb-1.5">Main Mentor Write-up</p>
                <p className="text-body-md text-fg leading-relaxed">{project.mentorBio}</p>
              </>
            )}
          </div>

          {/* Additional Requirements */}
          {project.additionalRequirements && (
            <div className="card p-6">
              <h2 className="text-headline-md text-fg mb-3">Additional Requirements</h2>
              <p className="text-body-md text-fg leading-relaxed">{project.additionalRequirements}</p>
            </div>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Submission Info */}
          <div className="card p-6">
            <h2 className="text-headline-md text-fg mb-4">Submission Info</h2>
            <div className="space-y-3">
              {[
                { label: 'Submitted by',   value: batch.pcHead },
                { label: 'Email',          value: batch.pc     },
                { label: 'Intern Category', value: batchEducationLevel(batch, eduMap) },
                { label: 'Uploaded',       value: fmtDate(batch.uploadedAt) },
                { label: 'Placements',     value: String(project.slots) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-3">
                  <p className="text-caption text-fg-muted shrink-0">{label}</p>
                  <p className="text-body-sm text-fg text-right">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Review Status */}
          <div className="card p-6">
            <h2 className="text-headline-md text-fg mb-3">Review Status</h2>
            <span className={cn('inline-flex text-caption-bold px-3 py-1.5 rounded-full', meta.cls)}>
              {meta.label}
            </span>
            {(project.status === 'rejected' || project.status === 'returnedForUpdate') && project.remarks && (
              <div className="mt-3 p-3 rounded-lg bg-danger-bg border border-danger/20">
                <p className="text-caption text-danger font-semibold mb-1">Rejection Remarks</p>
                <p className="text-body-sm text-fg">{project.remarks}</p>
              </div>
            )}
          </div>

          {/* Quick Actions (pending only) */}
          {project.status === 'pending' && (
            <div className="card p-5 space-y-3">
              <h2 className="text-headline-md text-fg mb-1">Review Actions</h2>
              <Button className="w-full" onClick={() => setConfirmApprove(true)}>
                <Check size={15} />Approve Project
              </Button>
              <Button variant="danger" className="w-full"
                onClick={() => { setRejectRemarks(''); setRejectOpen(true); }}>
                <X size={15} />Reject Project
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── AI Checks Drawer ──────────────────────────────────────────────── */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-fg/20" onClick={() => setAiDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-surface border-l border-border shadow-xl flex flex-col drawer-open">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <AiSparkleIcon size={16} />
                </div>
                <h2 className="text-headline-md text-fg">AI Quality Checks</h2>
              </div>
              <button
                onClick={() => setAiDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-bg-subtle text-fg-muted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <AiCheckRow
                label="Grammar & Professional Tone"
                result={project.aiCheck.grammar}
                notes={noteGroups.grammar}
              />
              <AiCheckRow
                label="Language Level / Readability"
                result={project.aiCheck.level}
                notes={noteGroups.level}
              />
              <AiCheckRow
                label="Scope–Category Alignment"
                result={scopeCheck?.result ?? 'pass'}
                notes={scopeCheck?.notes ?? []}
                last
              />
            </div>

            {/* Drawer footer — re-run */}
            <div className="shrink-0 px-5 py-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={rerunAi}
              >
                <AiSparkleIcon size={14} />Re-assess with AI
              </Button>
              <p className="text-[13px] text-fg-subtle text-center mt-2">
                Generates fresh title and scope suggestions based on the current content.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve modal ─────────────────────────────────────────────────── */}
      <Modal open={confirmApprove} onClose={() => setConfirmApprove(false)} maxWidth="sm" labelledBy="approve-project-title">
        <h2 id="approve-project-title" className="text-headline-md text-fg mb-2">Approve Project?</h2>
        <p className="text-body-md text-fg-muted mb-5">
          <span className="font-semibold text-fg">"{project.title}"</span> will be added to the confirmed projects list and made visible to applicants.
        </p>
        <div className="flex gap-3 justify-end">
          <Button onClick={() => { doApprove(); setConfirmApprove(false); }}>
            <Check size={15} />Confirm Approval
          </Button>
          <Button variant="ghost" onClick={() => setConfirmApprove(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Reject modal ──────────────────────────────────────────────────── */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" labelledBy="reject-project-title">
        <h2 id="reject-project-title" className="text-headline-md text-fg mb-2">Reject Project?</h2>
        <p className="text-body-md text-fg-muted mb-4">
          <span className="font-semibold text-fg">"{project.title}"</span> will be rejected. The remarks below will be shared with AD (P&amp;C).
        </p>
        <label className="block text-label-sm text-fg mb-1">Remarks <span className="text-danger">*</span></label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-md text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 mb-4"
          placeholder="Describe what needs to be changed…"
          value={rejectRemarks}
          onChange={e => setRejectRemarks(e.target.value)}
        />
        <div className="flex gap-3 justify-end">
          <Button variant="danger" onClick={() => { doReject(); setRejectOpen(false); }}>
            <X size={15} />Reject Project
          </Button>
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </Shell>
  );
}
