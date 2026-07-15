'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { PROJECT_SUBMISSION_COLUMNS, loadLiveProgrammeOptions, type ProjectSubmissionColumn } from '@/lib/data';
import { useToast, Toast } from '@/components/ui-legacy/toast';
import { addNotification } from '@/lib/notifications';
import { runAiCheck } from '@/lib/ai-check';
import { cn } from '@/lib/utils';
import { loadSubmissions, saveSubmissions } from '@/lib/storage';
import type { ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';

/* ── Storage ────────────────────────────────────────────────────────────────── */
const PROJ_TPL_KEY         = 'dsta_proj_template_columns';
const PROJ_TPL_SEED_VER    = '13';
const PROJ_TPL_VER_KEY     = 'dsta_proj_template_columns_seed_v';

function loadLiveColumns(): ProjectSubmissionColumn[] {
  try {
    if (localStorage.getItem(PROJ_TPL_VER_KEY) !== PROJ_TPL_SEED_VER) return PROJECT_SUBMISSION_COLUMNS;
    const raw = localStorage.getItem(PROJ_TPL_KEY);
    return raw ? JSON.parse(raw) : PROJECT_SUBMISSION_COLUMNS;
  } catch { return PROJECT_SUBMISSION_COLUMNS; }
}

/* ── Editable fields ────────────────────────────────────────────────────────── */
const EDIT_FIELDS: {
  label: string;
  field: keyof EditState;
  required: boolean;
}[] = [
  { label: 'Project Title',               field: 'title',                required: true },
  { label: 'Project Scope',               field: 'description',          required: true },
  { label: 'Programme centre',            field: 'pc',                   required: true },
  { label: 'Tech competency',             field: 'skillsRaw',            required: true },
  { label: 'Primary Mentor Name',         field: 'mentor',               required: true },
  { label: 'Primary Mentor Appointment',  field: 'mentorAppointment',    required: true },
  { label: 'Primary Mentor Email',        field: 'mentorUserId',         required: true },
  { label: 'Number of placements',        field: 'slots',                required: true },
];

interface EditState {
  title:             string;
  description:       string;
  mentor:            string;
  mentorAppointment: string;
  mentorUserId:      string;
  secondaryMentor:   string;
  secondaryMentorEmail: string;
  mentorBio:         string;
  skillsRaw:         string;
  slots:             number;
  pc:                string;
}

function toEditState(proj: SubmittedProject): EditState {
  return {
    title:             proj.title,
    description:       proj.description,
    mentor:            proj.mentor,
    mentorAppointment: proj.mentorAppointment ?? '',
    mentorUserId:      proj.mentorUserId ?? '',
    secondaryMentor:   proj.secondaryMentor ?? '',
    secondaryMentorEmail: proj.secondaryMentorEmail ?? '',
    mentorBio:         proj.mentorBio,
    skillsRaw:         proj.skills.join(', '),
    slots:             proj.slots,
    pc:                proj.pc ?? '',
  };
}

/* ── Form field wrapper ─────────────────────────────────────────────────────── */
function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-label-sm text-fg mb-1.5">
        {label}{required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_CLS    = 'w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-md text-fg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-fg-muted';
const TEXTAREA_CLS = INPUT_CLS + ' resize-none';
const ERROR_CLS = 'border-danger ring-1 ring-danger/30';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDropdown(colName: string): string[] {
  return PROJECT_SUBMISSION_COLUMNS.find(column => column.name === colName)?.dropdownValues ?? [];
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function AdPncEditSubmissionPage() {
  const params   = useParams();
  const router   = useRouter();
  const { toast: toastMsg, showToast } = useToast();

  const batchId = decodeURIComponent(params?.batchId as string ?? '');
  const projId  = decodeURIComponent(params?.projId  as string ?? '');

  const [batches,  setBatches]  = useState<ProjectSubmissionBatch[]>([]);
  const [progMap,  setProgMap]  = useState<Record<string, string>>({});
  const [edit,     setEdit]     = useState<EditState | null>(null);
  const [declC,    setDeclC]    = useState(false);
  const [declP,    setDeclP]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    const opts = loadLiveProgrammeOptions();
    setProgMap(Object.fromEntries(opts.map(p => [p.value, p.label])));
    loadLiveColumns(); // prime column cache
    const all = loadSubmissions();
    setBatches(all);
    const proj = all.find(b => b.id === batchId)?.projects.find(p => p.id === projId);
    if (proj) setEdit(toEditState(proj));
  }, [batchId, projId]);

  const batch = batches.find(b => b.id === batchId) ?? null;
  const proj  = batch?.projects.find(p => p.id === projId) ?? null;

  const canSave =
    !!edit?.title.trim() &&
    !!edit?.description.trim() &&
    !!edit?.pc.trim() &&
    !!edit?.skillsRaw.trim() &&
    !!edit?.mentor.trim() &&
    !!edit?.mentorAppointment.trim() &&
    !!edit?.mentorUserId.trim() &&
    EMAIL_RE.test(edit.mentorUserId.trim()) &&
    (!edit.secondaryMentorEmail.trim() || EMAIL_RE.test(edit.secondaryMentorEmail.trim())) &&
    edit.slots >= 1 &&
    declC &&
    declP;

  const missingDecl = !declC || !declP;
  const missingFields = EDIT_FIELDS.filter(f => f.required && !String(edit?.[f.field] ?? '').trim()).map(f => f.label);

  function handleSave() {
    if (!edit || !batch || !proj || !canSave) return;
    setSaving(true);
    const skills = edit.skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const resubmittedAt = new Date().toISOString();
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : {
        ...p,
        title:              edit.title.trim(),
        description:        edit.description.trim(),
        mentor:             edit.mentor.trim(),
        mentorAppointment:  edit.mentorAppointment.trim() || undefined,
        mentorUserId:       edit.mentorUserId.trim() || undefined,
        secondaryMentor:    edit.secondaryMentor.trim() || undefined,
        secondaryMentorEmail: edit.secondaryMentorEmail.trim() || undefined,
        mentorBio:          edit.mentorBio.trim(),
        skills,
        slots:              edit.slots,
        pc:                 edit.pc.trim() || undefined,
        techDomain:         skills[0] || undefined,
        status:             'pending' as const,
        remarks:            undefined,
        resubmittedAt,
        resubmittedBy:      b.submittedBy ?? b.pcHead,
        aiCheck:            runAiCheck(edit.title, edit.description, p.educationLevel ?? '', skills, skills[0] ?? ''),
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    addNotification({ forRole: 'io', title: `Project resubmitted — ${edit.title}`, body: `AD (P&C) has resubmitted "${edit.title}" for ${progMap[batch.programme] ?? batch.programme} after revision. Ready for IO review.`, href: '/projects', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `"${edit.title}" resubmitted for IO review.`);
    router.push('/submissions');
  }

  function setTechCompetency(index: number, value: string) {
    setEdit(prev => {
      if (!prev) return prev;
      const next = prev.skillsRaw.split(',').map(item => item.trim()).filter(Boolean);
      if (value) next[index] = value;
      else next.splice(index, 1);
      return { ...prev, skillsRaw: next.filter(Boolean).slice(0, 3).join(', ') };
    });
  }

  if (batches.length > 0 && (!batch || !proj)) {
    return (
      <Shell activeRoute="/submissions" hideNavigation>
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <p className="text-body-lg text-fg-muted">Project not found.</p>
          <Button variant="ghost" onClick={() => router.push('/submissions')}>
            <ChevronLeft size={14} />Back to Submissions
          </Button>
        </div>
      </Shell>
    );
  }

  if (!proj || !edit) return null;

  return (
    <Shell activeRoute="/submissions" hideNavigation>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-label-md mb-5">
        <button
          onClick={() => router.push('/submissions')}
          className="text-fg-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={14} />Submissions
        </button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold truncate">Resubmit Project</span>
      </nav>

      <div className="mx-auto max-w-6xl pb-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* Main column — header + edit form */}
          <div className="min-w-0 space-y-6">
            {/* Header */}
            <div className="rounded-2xl border border-border bg-surface px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-headline-lg font-bold text-fg truncate">{proj.title}</h1>
                  <p className="text-body-md text-fg-muted mt-0.5">
                    {progMap[batch?.programme ?? ''] ?? batch?.programme} · {proj.mentor}
                  </p>
                </div>
                <span className="badge bg-warning-bg text-warning shrink-0">Returned for Revision</span>
              </div>
            </div>

            {/* Edit form — two-up grid, long text fields span full width */}
            <div className="rounded-2xl border border-border bg-surface px-6 py-5">
              <h2 className="text-label-lg font-semibold text-fg mb-5">Edit Project Details</h2>
              <div className="space-y-5">
                <Field label="Project title" required>
                  <input className={INPUT_CLS} value={edit.title} onChange={e => setEdit(prev => prev ? { ...prev, title: e.target.value } : prev)} />
                </Field>
                <Field label="Project scope" required>
                  <textarea rows={5} className={TEXTAREA_CLS} value={edit.description} onChange={e => setEdit(prev => prev ? { ...prev, description: e.target.value } : prev)} />
                </Field>
                <Field label="Programme centre" required>
                  <Select value={edit.pc} onValueChange={value => setEdit(prev => prev ? { ...prev, pc: value ?? '' } : prev)}>
                    <SelectTrigger aria-label="Programme centre">
                      <SelectValue placeholder="Select programme centre" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDropdown('PC').map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <div>
                  <p className="mb-2 text-label-sm text-fg">
                    Tech competency (3 options)<span className="text-danger">*</span>
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[0, 1, 2].map(index => {
                      const selected = edit.skillsRaw.split(',').map(item => item.trim()).filter(Boolean);
                      return (
                        <Field key={index} label={`Option ${index + 1}`}>
                          <Select value={selected[index] ?? ''} onValueChange={value => setTechCompetency(index, value ?? '')}>
                            <SelectTrigger aria-label={`Tech competency option ${index + 1}`}>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {getDropdown('Tech Domain').map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Primary Mentor Name" required>
                    <input className={INPUT_CLS} value={edit.mentor} onChange={e => setEdit(prev => prev ? { ...prev, mentor: e.target.value } : prev)} />
                  </Field>
                  <Field label="Primary Mentor Appointment" required>
                    <input className={INPUT_CLS} value={edit.mentorAppointment} onChange={e => setEdit(prev => prev ? { ...prev, mentorAppointment: e.target.value } : prev)} />
                  </Field>
                  <Field label="Primary Mentor Email" required>
                    <input className={cn(INPUT_CLS, edit.mentorUserId && !EMAIL_RE.test(edit.mentorUserId.trim()) && ERROR_CLS)} value={edit.mentorUserId} onChange={e => setEdit(prev => prev ? { ...prev, mentorUserId: e.target.value } : prev)} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Secondary Mentor Name">
                    <input className={INPUT_CLS} value={edit.secondaryMentor} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentor: e.target.value } : prev)} />
                  </Field>
                  <Field label="Secondary Mentor Email">
                    <input className={cn(INPUT_CLS, edit.secondaryMentorEmail && !EMAIL_RE.test(edit.secondaryMentorEmail.trim()) && ERROR_CLS)} value={edit.secondaryMentorEmail} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentorEmail: e.target.value } : prev)} />
                  </Field>
                </div>
                <Field label="Number of placements" required>
                  <input
                    type="number"
                    min={1}
                    className={cn('max-w-32', INPUT_CLS)}
                    value={edit.slots === 0 ? '' : edit.slots}
                    onChange={e => {
                      const next = parseInt(e.target.value, 10);
                      setEdit(prev => prev ? { ...prev, slots: Number.isNaN(next) ? 0 : next } : prev);
                    }}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Sidebar — feedback, declarations, resubmit (sticky) */}
          <div className="space-y-5 lg:sticky lg:top-6">
            {/* IO feedback */}
            {proj.remarks && (
              <div className="rounded-xl border border-warning/30 bg-warning-bg px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle size={14} className="text-warning shrink-0" />
                  <p className="text-[12px] font-black text-warning uppercase tracking-wide">IO Feedback — address before resubmitting</p>
                </div>
                <p className="text-body-md text-fg">{proj.remarks}</p>
              </div>
            )}

            {/* Declarations + submit */}
            <div className={cn(
              'rounded-2xl border px-6 py-5 space-y-4 transition-colors',
              missingDecl ? 'border-warning/40 bg-warning-bg/40' : 'border-border bg-surface',
            )}>
              <div className="flex items-center justify-between">
                <h2 className="text-label-lg font-semibold text-fg">Declarations</h2>
                {missingDecl && (
                  <span className="text-[12px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                    {[!declC, !declP].filter(Boolean).length} remaining
                  </span>
                )}
              </div>
              {[
                { state: declC, set: setDeclC, text: 'I confirm that security clearance for all projects in this submission has been obtained.' },
                { state: declP, set: setDeclP, text: 'I confirm that all projects in this submission have received PC Head approval.' },
              ].map(({ state, set, text }, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} className="mt-0.5 accent-accent shrink-0" />
                  <span className="text-body-sm text-fg leading-snug">{text}</span>
                </label>
              ))}

              <div className="pt-2 space-y-2">
                <Button
                  className="w-full justify-center"
                  disabled={!canSave || saving}
                  onClick={handleSave}
                >
                  <RotateCcw size={15} />{saving ? 'Resubmitting…' : 'Resubmit for IO Review'}
                </Button>
                {missingFields.length > 0 && (
                  <p className="text-body-sm text-danger text-center">
                    Required fields missing: {missingFields.join(', ')}.
                  </p>
                )}
                {missingDecl && missingFields.length === 0 && (
                  <p className="text-body-sm text-warning text-center">
                    Check both declarations above to enable resubmission.
                  </p>
                )}
              </div>
            </div>

            <Button variant="ghost" onClick={() => router.push('/submissions')} className="w-full justify-center">
              Cancel — go back
            </Button>
          </div>
        </div>
      </div>

      <Toast message={toastMsg} />
    </Shell>
  );
}
