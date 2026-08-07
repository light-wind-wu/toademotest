'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Badge } from '@/components/ui-legacy/badge';
import RequestContextTable from '@/components/ui-legacy/request-context-table';
import AiCheckBlock from '@/components/ui-legacy/ai-check-block';
import Combobox from '@/components/ui-legacy/combobox';
import FieldRequired from '@/components/ui-legacy/field-required';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronLeft, Check, AlertTriangle, Clock, History, Minus, Plus, FileClock } from 'lucide-react';
import { PROJECT_SUBMISSION_COLUMNS, loadLiveProgrammeOptions, toEducationLevel, type ProjectSubmissionColumn } from '@/lib/data';
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline } from '@/lib/disciplines';
import { useToast, Toast } from '@/components/ui-legacy/toast';
import { addNotification } from '@/lib/notifications';
import { runAiCheck } from '@/lib/ai-check';
import { cn } from '@/lib/utils';
import { loadRequests, loadSubmissions, saveSubmissions, saveRequests } from '@/lib/storage';
import { groupRequests, requestRawCategory, projectMatchesRequest } from '@/lib/request-groups';
import type { ProjectRequest, ProjectSubmissionBatch, RequestStatus, SubmittedProject } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Editable fields ────────────────────────────────────────────────────────── */
const EDIT_FIELDS: {
  label: string;
  field: keyof EditState;
  required: boolean;
}[] = [
  { label: 'Project Title', field: 'title', required: true },
  { label: 'Project Scope', field: 'description', required: true },
  { label: 'Programme centre', field: 'pc', required: true },
  { label: 'Intern category', field: 'educationLevel', required: true },
  { label: 'Tech competency', field: 'skillsRaw', required: true },
  { label: 'Discipline of study', field: 'discipline', required: true },
  { label: 'Primary Mentor Name', field: 'mentor', required: true },
  { label: 'Primary Mentor Appointment', field: 'mentorAppointment', required: true },
  { label: 'Primary Mentor Email', field: 'mentorUserId', required: true },
  { label: 'Number of placements', field: 'slots', required: true },
];

interface EditState {
  title: string;
  description: string;
  educationLevel: string;
  mentor: string;
  mentorAppointment: string;
  mentorUserId: string;
  secondaryMentor: string;
  secondaryMentorAppointment: string;
  secondaryMentorEmail: string;
  mentorBio: string;
  skillsRaw: string;
  discipline: string;
  slots: number;
  pc: string;
}

function toEditState(proj: SubmittedProject): EditState {
  return {
    title: proj.title,
    description: proj.description,
    educationLevel: proj.educationLevel ?? '',
    mentor: proj.mentor,
    mentorAppointment: proj.mentorAppointment ?? '',
    mentorUserId: proj.mentorUserId ?? '',
    secondaryMentor: proj.secondaryMentor ?? '',
    secondaryMentorAppointment: proj.secondaryMentorAppointment ?? '',
    secondaryMentorEmail: proj.secondaryMentorEmail ?? '',
    mentorBio: proj.mentorBio,
    skillsRaw: deriveTechCompetencies(proj).join(', '),
    discipline: proj.discipline ?? '',
    slots: proj.slots,
    pc: proj.pc ?? '',
  };
}

/* ── Form field wrapper ─────────────────────────────────────────────────────── */
function Field({ label, required, error, className, children }: { label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block text-label-sm text-fg mb-1.5">
        {label}{required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <FieldRequired show message={error} />}
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

function deriveTechCompetencies(proj: SubmittedProject): string[] {
  const valid = new Set(getDropdown('Tech Domain'));
  const values = [proj.techDomain, ...(proj.skills || [])].filter((s): s is string => !!s);
  const matched = values.filter(s => valid.has(s));
  return Array.from(new Set(matched)).slice(0, 3);
}

/* ── Audit log ─────────────────────────────────────────────────────────────── */
function buildAuditLog(proj: SubmittedProject, pc: string) {
  const entries: { date: string; label: string; description: string }[] = [];
  if (proj.submittedAt) {
    entries.push({
      date: fmtDate(proj.submittedAt),
      label: 'Pending review',
      description: `Project submitted to IO for review under ${pc || 'PC'}.`,
    });
  }
  if (proj.remarks && (proj.status === 'rejected' || proj.status === 'returnedForUpdate')) {
    entries.push({
      date: proj.submittedAt ? fmtDate(proj.submittedAt) : '—',
      label: 'Returned for Update',
      description: proj.remarks,
    });
  }
  if (proj.resubmittedAt) {
    entries.push({
      date: fmtDate(proj.resubmittedAt),
      label: 'Resubmitted',
      description: `Project resubmitted for IO review under ${pc || 'PC'}.`,
    });
  }
  return entries;
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function AdPncEditSubmissionPage() {
  const params   = useParams();
  const router   = useRouter();
  const { toast: toastMsg, showToast } = useToast();

  const batchId = decodeURIComponent(params?.batchId as string ?? '');
  const projId  = decodeURIComponent(params?.projId  as string ?? '');

  const [batches,  setBatches]  = useState<ProjectSubmissionBatch[]>([]);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [progMap,  setProgMap]  = useState<Record<string, string>>({});
  const [edit,     setEdit]     = useState<EditState | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    const opts = loadLiveProgrammeOptions();
    setProgMap(Object.fromEntries(opts.map(p => [p.value, p.label])));
    loadLiveColumns(); // prime column cache
    setRequests(loadRequests());
    const all = loadSubmissions();
    setBatches(all);
    const proj = all.find(b => b.id === batchId)?.projects.find(p => p.id === projId);
    if (proj) setEdit(toEditState(proj));
  }, [batchId, projId]);

  const batch = batches.find(b => b.id === batchId) ?? null;
  const proj  = batch?.projects.find(p => p.id === projId) ?? null;

  const group = useMemo(() => {
    if (!batch) return null;
    return groupRequests(requests).find(g => g.key === batch.uploadToken) ?? null;
  }, [batch, requests]);

  const internCategoryOptions = useMemo(() => {
    if (!group) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const req of group.requests) {
      const category = requestRawCategory(req);
      if (category && !seen.has(category)) {
        seen.add(category);
        list.push(category);
      }
    }
    return list;
  }, [group]);

  function validate(state: EditState | null): Record<string, string> {
    if (!state) return {};
    const next: Record<string, string> = {};

    for (const f of EDIT_FIELDS) {
      if (f.field === 'slots') continue;
      if (f.required && !String(state[f.field]).trim()) {
        next[f.field] = `${f.label} is required.`;
      }
    }

    if (state.slots < 1) {
      next.slots = 'At least 1 placement is required.';
    }

    if (!next.mentorUserId && !EMAIL_RE.test(state.mentorUserId.trim())) {
      next.mentorUserId = 'Enter a valid email address.';
    }

    if (state.secondaryMentorEmail.trim() && !EMAIL_RE.test(state.secondaryMentorEmail.trim())) {
      next.secondaryMentorEmail = 'Enter a valid email address.';
    }

    const techOptions = new Set(getDropdown('Tech Domain'));
    const skills = state.skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (skills.length === 0 && !next.skillsRaw) {
      next.skillsRaw = 'Tech competency is required.';
    } else if (skills.some(s => !techOptions.has(s))) {
      next.skillsRaw = 'Select valid tech competencies.';
    }

    const disciplines = parseDisciplines(state.discipline);
    if (disciplines.length === 0 && !next.discipline) {
      next.discipline = 'Discipline of study is required.';
    } else if (disciplines.some(d => !DISCIPLINE_OPTIONS.includes(d))) {
      next.discipline = 'Select valid disciplines.';
    }

    return next;
  }

  const auditLog = proj ? buildAuditLog(proj, edit?.pc ?? proj.pc ?? '') : [];

  function handleSave() {
    if (!edit || !batch || !proj) return;
    const validationErrors = validate(edit);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSaving(true);
    const skills = edit.skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const resubmittedAt = new Date().toISOString();
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : {
        ...p,
        title:              edit.title.trim(),
        description:        edit.description.trim(),
        educationLevel:     edit.educationLevel ? toEducationLevel(edit.educationLevel) : p.educationLevel,
        mentor:             edit.mentor.trim(),
        mentorAppointment:  edit.mentorAppointment.trim() || undefined,
        mentorUserId:       edit.mentorUserId.trim() || undefined,
        secondaryMentor:    edit.secondaryMentor.trim() || undefined,
        secondaryMentorAppointment: edit.secondaryMentorAppointment.trim() || undefined,
        secondaryMentorEmail: edit.secondaryMentorEmail.trim() || undefined,
        mentorBio:          edit.mentorBio.trim(),
        skills,
        discipline:         edit.discipline.trim(),
        slots:              edit.slots,
        pc:                 edit.pc.trim() || undefined,
        techDomain:         skills[0] || undefined,
        status:             'pending' as const,
        remarks:            undefined,
        resubmittedAt,
        resubmittedBy:      b.submittedBy ?? b.pcHead,
        aiCheck:            runAiCheck(edit.title, edit.description, edit.educationLevel, skills, skills[0] ?? ''),
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);

    const updatedRequests = requests.map(request => {
      if (request.uploadToken !== batch.uploadToken) return request;
      const matchingProjects = updated
        .filter(b => b.uploadToken === batch.uploadToken)
        .flatMap(b => b.projects)
        .filter(p => p.status !== 'withdrawn')
        .filter(p => projectMatchesRequest(p, request));
      const nextUploaded = matchingProjects.reduce((sum, p) => sum + p.slots, 0);
      const nextStatus: RequestStatus =
        nextUploaded > request.placements
          ? 'excess'
          : nextUploaded === request.placements
            ? 'matched'
            : nextUploaded > 0
              ? 'partial'
              : 'pending';
      return { ...request, uploaded: nextUploaded, created: matchingProjects.length, status: nextStatus };
    });
    setRequests(updatedRequests);
    saveRequests(updatedRequests);

    addNotification({ forRole: 'io', title: `Project resubmitted — ${edit.title}`, body: `AD (P&C) has resubmitted "${edit.title}" for ${progMap[batch.programme] ?? batch.programme} after revision. Ready for IO review.`, href: '/projects', tier: 'action' });
    sessionStorage.setItem('dsta_pending_toast', `"${edit.title}" resubmitted for IO review.`);
    sessionStorage.setItem('dsta_submissions_success_dialog', '1');
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
      <div className="mx-auto max-w-1xl">
        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-2 text-body-sm text-fg-muted">
          <button type="button" onClick={() => router.push('/submissions')} className="hover:text-accent">
            Project request
          </button>
          <ChevronRight size={14} className="text-fg-subtle" />
          <span>Update Returned Project</span>
          <ChevronRight size={14} className="text-fg-subtle" />
          <span className="font-medium text-fg">Edit Project</span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-headline-lg text-fg">{proj.title}</h1>
          <Badge variant="warning">Returned for Update</Badge>
        </div>

        {group && group.requests.length > 0 && (
          <RequestContextTable requests={group.requests} className="mb-6 p-5 border border-border" highlightedCategory={edit.educationLevel} batches={batches} />
        )}

        <div className="space-y-6">

          {/* Edit form */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="space-y-5">
              <h2 className="text-body-lg font-semibold text-fg leading-tight ">Edit Project</h2>
              {/* IO feedback */}
              {proj.remarks && (
                <div className="rounded-lg border border-[#E6E1D8] bg-[#F3EFE5] px-5 py-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-caption font-semibold tracking-wide text-[#162133]">IO feedback</p>
                  </div>
                  <p className="text-body-sm text-[#4A5568]">{proj.remarks}</p>
                </div>
              )}
              <Field label="Programme centre" required error={errors.pc} className="max-w-[33%]">
                <Select value={edit.pc} onValueChange={value => setEdit(prev => prev ? { ...prev, pc: value ?? '' } : prev)}>
                  <SelectTrigger aria-label="Programme centre">
                    <SelectValue placeholder="Select programme centre" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDropdown('PC').map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Intern category" required error={errors.educationLevel} className="max-w-[33%]">
                <Select value={edit.educationLevel} onValueChange={value => setEdit(prev => prev ? { ...prev, educationLevel: value ?? '' } : prev)}>
                  <SelectTrigger aria-label="Intern category">
                    <SelectValue placeholder="Select intern category" />
                  </SelectTrigger>
                  <SelectContent>
                    {internCategoryOptions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Project title" required error={errors.title}>
                <input
                  className={cn(INPUT_CLS, errors.title && ERROR_CLS)}
                  value={edit.title}
                  onChange={e => setEdit(prev => prev ? { ...prev, title: e.target.value } : prev)}
                />
                <AiCheckBlock
                  title={edit.title}
                  educationLevel={edit.educationLevel}
                  skills={edit.skillsRaw.split(',').map(s => s.trim()).filter(Boolean)}
                />
              </Field>

              <Field label="Project scope" required error={errors.description} className="max-w-[66%]">
                <textarea
                  rows={5}
                  className={cn(TEXTAREA_CLS, errors.description && ERROR_CLS)}
                  value={edit.description}
                  onChange={e => setEdit(prev => prev ? { ...prev, description: e.target.value } : prev)}
                />
                <AiCheckBlock
                  title={edit.title}
                  description={edit.description}
                  educationLevel={edit.educationLevel}
                  skills={edit.skillsRaw.split(',').map(s => s.trim()).filter(Boolean)}
                />
              </Field>

              <Field label="Tech competency (up to 3)" required error={errors.skillsRaw}>
                <Combobox
                  selected={edit.skillsRaw.split(',').map(s => s.trim()).filter(Boolean)}
                  onToggle={(opt) => {
                    setEdit(prev => {
                      if (!prev) return prev;
                      const selected = prev.skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
                      const next = selected.includes(opt)
                        ? selected.filter(s => s !== opt)
                        : selected.length < 3
                          ? [...selected, opt]
                          : selected;
                      return { ...prev, skillsRaw: next.join(', ') };
                    });
                  }}
                  options={getDropdown('Tech Domain')}
                  placeholder="Select tech competencies…"
                  chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                  chips="inline"
                  error={!!errors.skillsRaw}
                />
              </Field>

              <Field label="Discipline of study (up to 3)" required error={errors.discipline}>
                <Combobox
                  selected={parseDisciplines(edit.discipline)}
                  onToggle={(opt) => {
                    setEdit(prev => prev ? { ...prev, discipline: toggleDiscipline(prev.discipline, opt) } : prev);
                  }}
                  options={DISCIPLINE_OPTIONS}
                  placeholder="Select disciplines…"
                  chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                  chips="inline"
                  error={!!errors.discipline}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Primary Mentor Name" required error={errors.mentor}>
                  <input className={cn(INPUT_CLS, errors.mentor && ERROR_CLS)} value={edit.mentor} onChange={e => setEdit(prev => prev ? { ...prev, mentor: e.target.value } : prev)} />
                </Field>
                <Field label="Primary Mentor Appointment" required error={errors.mentorAppointment}>
                  <input className={cn(INPUT_CLS, errors.mentorAppointment && ERROR_CLS)} value={edit.mentorAppointment} onChange={e => setEdit(prev => prev ? { ...prev, mentorAppointment: e.target.value } : prev)} />
                </Field>
                <Field label="Primary Mentor Email" required error={errors.mentorUserId}>
                  <input className={cn(INPUT_CLS, (errors.mentorUserId || (edit.mentorUserId && !EMAIL_RE.test(edit.mentorUserId.trim()))) && ERROR_CLS)} value={edit.mentorUserId} onChange={e => setEdit(prev => prev ? { ...prev, mentorUserId: e.target.value } : prev)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Secondary Mentor Name">
                  <input className={INPUT_CLS} value={edit.secondaryMentor} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentor: e.target.value } : prev)} />
                </Field>
                <Field label="Secondary Mentor Appointment">
                  <input className={INPUT_CLS} value={edit.secondaryMentorAppointment} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentorAppointment: e.target.value } : prev)} />
                </Field>
                <Field label="Secondary Mentor Email" error={errors.secondaryMentorEmail}>
                  <input className={cn(INPUT_CLS, (errors.secondaryMentorEmail || (edit.secondaryMentorEmail && !EMAIL_RE.test(edit.secondaryMentorEmail.trim()))) && ERROR_CLS)} value={edit.secondaryMentorEmail} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentorEmail: e.target.value } : prev)} />
                </Field>
              </div>

              <Field label="Number of placements" required error={errors.slots}>
                <div className="flex items-center gap-3">
                  <div className={cn("inline-flex items-center rounded-lg border bg-surface", errors.slots ? "border-danger" : "border-border")}>
                    <button
                      type="button"
                      onClick={() => setEdit(prev => prev ? { ...prev, slots: Math.max(1, prev.slots - 1) } : prev)}
                      className="grid h-9 w-9 place-items-center text-fg hover:bg-bg-subtle"
                      aria-label="Decrease placements"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="flex h-9 w-12 items-center justify-center border-x border-border text-body-md font-medium text-fg">
                      {edit.slots || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEdit(prev => prev ? { ...prev, slots: prev.slots + 1 } : prev)}
                      className="grid h-9 w-9 place-items-center text-fg hover:bg-bg-subtle"
                      aria-label="Increase placements"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-body-sm text-fg-muted mt-2">
                  You may offer more placements than requested on this project. New project rows cannot be added once the requested project count for this category is reached.
                </p>
              </Field>
            </div>
          </div>

          {/* Audit Log */}
          {!edit && (
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-label-lg font-semibold text-fg">Audit Log</h2>
                  <div className="flex items-center gap-2 text-body-sm text-fg-muted hidden">
                    <Clock size={14} />
                    <span>Current status</span>
                    <Badge variant="warning">Returned for Update</Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuditOpen(o => !o)}
                >
                  <FileClock size={14} />
                  {auditOpen ? 'Collapse Audit Log' : 'View All Audit Log'}
                </Button>
              </div>

              {auditOpen && (
                <div className="mt-5 space-y-4">
                  {auditLog.length === 0 ? (
                    <p className="text-body-sm text-fg-muted">No audit log entries available.</p>
                  ) : (
                    auditLog.map((entry, index) => (
                      <div key={index} className="flex items-start gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
                        <span className="w-28 shrink-0 text-body-sm text-fg-muted">{entry.date}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm font-medium text-fg">{entry.label}</p>
                          <p className="text-body-sm text-fg-muted">{entry.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-2">
        <p className="text-body-sm text-fg-muted">
          <Button variant="ghost" size="md" onClick={() => router.push('/submissions')}>
            Back
          </Button>
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="md" onClick={() => router.push('/submissions')}>
            Cancel
          </Button>
          <Button size="md" disabled={saving} onClick={() => {
            const validationErrors = validate(edit);
            setErrors(validationErrors);
            if (Object.keys(validationErrors).length === 0) setConfirmSaveOpen(true);
          }}>
            {saving ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </div>

      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send project?</DialogTitle>
            <DialogDescription>
              Your projects will be sent to the IO review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setConfirmSaveOpen(false); handleSave(); }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast message={toastMsg} />
    </Shell>
  );
}
