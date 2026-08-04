'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Badge } from '@/components/ui/badge';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import Combobox from '@/components/ui-legacy/combobox';
import DateRangePicker from '@/components/ui-legacy/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, Minus, Plus } from 'lucide-react';
import { PC_CODES, TECH_DOMAINS, EDUCATION_LEVELS, toEducationLevel } from '@/lib/data';
import { AI_COLOURS } from '@/lib/ai-colours';
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline } from '@/lib/disciplines';
import { periodLabelToMMMYY, mmmyyToISO, mmmyyToISOEnd } from '@/lib/internship-period';
import { loadSubmissions, saveSubmissions } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';

const DURATION_OPTS = ['1 Month', '2 Months', '3 Months', '4 Months', '6 Months', '12 Months'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalise a stored internship-window value to an ISO day ("2026-06-01"); legacy
   month values (MMMYY / "Jun 2026") become the first / last day of the month. */
function isoDay(v: string | undefined | null, isEnd: boolean): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = periodLabelToMMMYY(v);
  return m ? (isEnd ? mmmyyToISOEnd(m) : mmmyyToISO(m)) : '';
}

function Field({ label, required, error, className, children }: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-label-sm text-fg mb-1.5">
        {label}{required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-body-sm text-danger">{error}</p>}
    </div>
  );
}

const INPUT_CLS = 'w-full rounded-lg border border-border bg-bg-subtle px-3 py-2 text-body-md text-fg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-fg-muted';
const TEXTAREA_CLS = INPUT_CLS + ' resize-none';
const ERROR_CLS = 'border-danger ring-1 ring-danger/30';

function AiRecommendation({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className={cn('mt-3 rounded-lg border border-warning/30 px-3 py-3', AI_COLOURS.checkReview.badge)}>
      <p className="text-caption font-semibold text-[rgba(187,77,0,1)]"><AiSparkleIcon size={13} className="inline" /> AI recommendation</p>
      <ul className="mt-1 space-y-0.5">
        {notes.slice(0, 2).map((note, idx) => (
          <li key={idx} className="text-caption leading-snug text-[rgba(187,77,0,1)]">{note}</li>
        ))}
      </ul>
    </div>
  );
}

interface EditState {
  title: string;
  description: string;
  pc: string;
  educationLevel: string;
  skills: string[];
  discipline: string;
  slots: number;
  internshipDuration: string;
  internshipPeriodStart: string;
  internshipPeriodEnd: string;
  mentor: string;
  mentorAppointment: string;
  mentorEmail: string;
  secondaryMentor: string;
  secondaryMentorAppointment: string;
  secondaryMentorEmail: string;
}

function toEditState(proj: SubmittedProject): EditState {
  return {
    title: proj.title,
    description: proj.description,
    pc: proj.pc ?? '',
    educationLevel: proj.educationLevel ?? '',
    skills: (proj.skills || []).slice(0, 3),
    discipline: proj.discipline ?? '',
    slots: proj.slots,
    internshipDuration: proj.internshipDuration ?? '',
    internshipPeriodStart: proj.internshipPeriodStart ?? '',
    internshipPeriodEnd: proj.internshipPeriodEnd ?? '',
    mentor: proj.mentor,
    mentorAppointment: proj.mentorAppointment ?? '',
    mentorEmail: proj.mentorEmail || proj.mentorUserId || '',
    secondaryMentor: proj.secondaryMentor ?? '',
    secondaryMentorAppointment: proj.secondaryMentorAppointment ?? '',
    secondaryMentorEmail: proj.secondaryMentorEmail ?? '',
  };
}

export default function RequestProjectEditPage() {
  const router = useRouter();
  const params = useParams<{ batchId: string; projId: string }>();
  const batchId = decodeURIComponent(params.batchId ?? '');
  const projId = decodeURIComponent(params.projId ?? '');
  const { toast, showToast } = useToast();

  const [batches, setBatches] = useState<ProjectSubmissionBatch[]>([]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  useEffect(() => {
    const all = loadSubmissions();
    setBatches(all);
    const proj = all.find(b => b.id === batchId)?.projects.find(p => p.id === projId);
    if (proj) setEdit(toEditState(proj));
  }, [batchId, projId]);

  const batch = useMemo(() => batches.find(b => b.id === batchId) ?? null, [batches, batchId]);
  const proj = useMemo(() => batch?.projects.find(p => p.id === projId) ?? null, [batch, projId]);

  const aiNotes = useMemo(() => {
    if (!edit) return [];
    const notes: string[] = [];
    const desc = edit.description.trim();
    if (desc.split(/\s+/).filter(Boolean).length < 25) {
      notes.push('Specify the expected deliverable so the scope is clear across intern categories. Consider covering the intern\'s tasks, tools or methods, and expected learning outcomes.');
    }
    if (!/\b(intern|you will|student|applicant|you'll|candidate|participant)\b/i.test(desc)) {
      notes.push('Scope does not directly address the intern. Rewrite using intern-facing language (e.g., "Interns will…", "You will…").');
    }
    if (!/\b(deliver|report|prototype|model|system|tool|dashboard|analysis|present|produce|build|develop|implement|document|code|paper)\b/i.test(desc)) {
      notes.push('No expected deliverables identified. State what the intern will produce or present at the end of the internship.');
    }
    return notes;
  }, [edit?.description]);

  function validate(state: EditState | null): Record<string, string> {
    if (!state) return {};
    const next: Record<string, string> = {};
    if (!state.title.trim()) next.title = 'Project title is required.';
    if (!state.description.trim()) next.description = 'Project scope is required.';
    if (!state.pc.trim()) next.pc = 'Programme centre is required.';
    if (!state.educationLevel.trim()) next.educationLevel = 'Intern category is required.';
    if (state.skills.length === 0) next.skills = 'Skill set is required.';
    if (!state.discipline.trim()) next.discipline = 'Discipline of study is required.';
    if (!state.internshipDuration.trim()) next.internshipDuration = 'Project duration is required.';
    if (!state.internshipPeriodStart || !state.internshipPeriodEnd) next.internshipWindow = 'Internship window is required.';
    if (state.slots < 1) next.slots = 'At least 1 placement is required.';
    if (!state.mentor.trim()) next.mentor = 'Primary mentor name is required.';
    if (!state.mentorAppointment.trim()) next.mentorAppointment = 'Primary mentor appointment is required.';
    if (!state.mentorEmail.trim()) next.mentorEmail = 'Primary mentor email is required.';
    else if (!EMAIL_RE.test(state.mentorEmail.trim())) next.mentorEmail = 'Enter a valid email address.';
    if (state.secondaryMentorEmail.trim() && !EMAIL_RE.test(state.secondaryMentorEmail.trim())) {
      next.secondaryMentorEmail = 'Enter a valid email address.';
    }
    return next;
  }

  function handleSave() {
    if (!edit || !batch || !proj) return;
    const validationErrors = validate(edit);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setConfirmSaveOpen(true);
  }

  function doSave() {
    if (!edit || !batch || !proj) return;
    setSaving(true);
    const updated = batches.map(b => b.id !== batchId ? b : {
      ...b,
      projects: b.projects.map(p => p.id !== projId ? p : {
        ...p,
        title: edit.title.trim(),
        description: edit.description.trim(),
        pc: edit.pc.trim() || undefined,
        educationLevel: edit.educationLevel ? toEducationLevel(edit.educationLevel) : p.educationLevel,
        skills: edit.skills,
        techDomain: edit.skills[0] || undefined,
        discipline: edit.discipline.trim(),
        slots: edit.slots,
        internshipDuration: edit.internshipDuration || undefined,
        internshipPeriodStart: edit.internshipPeriodStart || undefined,
        internshipPeriodEnd: edit.internshipPeriodEnd || undefined,
        mentor: edit.mentor.trim(),
        mentorAppointment: edit.mentorAppointment.trim() || undefined,
        mentorEmail: edit.mentorEmail.trim() || undefined,
        mentorUserId: edit.mentorEmail.trim() || undefined,
        secondaryMentor: edit.secondaryMentor.trim() || undefined,
        secondaryMentorAppointment: edit.secondaryMentorAppointment.trim() || undefined,
        secondaryMentorEmail: edit.secondaryMentorEmail.trim() || undefined,
        reviewedAt: new Date().toISOString(),
      }),
    });
    setBatches(updated);
    saveSubmissions(updated);
    showToast('Project details saved.');
    router.push(`/requests/project/${encodeURIComponent(batchId)}/${encodeURIComponent(projId)}`);
  }

  if (batches.length > 0 && (!batch || !proj)) {
    return (
      <Shell activeRoute="/requests">
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <p className="text-body-lg text-fg-muted">Project not found.</p>
          <Button variant="ghost" onClick={() => router.push('/requests')}>
            <ChevronLeft size={14} />Back to Requests
          </Button>
        </div>
      </Shell>
    );
  }

  if (!proj || !edit) {
    return (
      <Shell activeRoute="/requests">
        <div className="flex items-center justify-center h-64 text-fg-muted text-body-md">Loading…</div>
      </Shell>
    );
  }

  return (
    <Shell activeRoute="/requests">
      <div className="flex min-h-[calc(100vh-180px)] flex-col">
        <div className="flex-1">
          {/* Breadcrumb */}
          <nav className="mb-3 flex items-center gap-2 text-body-sm text-fg-muted">
            <button type="button" onClick={() => router.push('/requests')} className="hover:text-accent">
              Project request
            </button>
            <ChevronRight size={14} className="text-fg-subtle" />
            <button type="button" onClick={() => router.push('/requests?tab=submissions')} className="hover:text-accent">
              Project Submissions
            </button>
            <ChevronRight size={14} className="text-fg-subtle" />
            <span className="font-medium text-fg">{proj.title}</span>
          </nav>

          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="text-headline-lg text-fg">{proj.title}</h1>
            <Badge className="bg-warning-bg text-warning border-warning/30">Pending</Badge>
          </div>

          <p className="mb-4 text-body-sm text-fg-muted">
            Review the submitted project information, resolve any flagged items, and decide whether the project can proceed.
          </p>

          {/* Form card */}
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="space-y-6">
              {/* Review required */}
              <div>
                <h2 className="text-body-md font-bold text-fg">Review required</h2>
                <div className="mt-4">
                <Field label="Project scope" required error={errors.description} className="max-w-[66%]">
                  <textarea
                    rows={5}
                    className={cn(TEXTAREA_CLS, errors.description && ERROR_CLS)}
                    value={edit.description}
                    onChange={e => setEdit(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  />
                  <AiRecommendation notes={aiNotes} />
                </Field>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Project details */}
              <div className="space-y-6">
                <h2 className="text-body-md font-bold text-fg">Project details</h2>

                {/* Basic Information */}
                <div>
                  <p className="text-body-sm font-semibold text-fg mb-3">Basic Information</p>
                  <div className="space-y-4">
                <Field label="Project title" required error={errors.title} className="max-w-[33%]">
                  <input
                    className={cn(INPUT_CLS, errors.title && ERROR_CLS)}
                    value={edit.title}
                    onChange={e => setEdit(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn('badge inline-flex items-center gap-1 text-caption font-normal border border-[rgba(0,201,80,0.2)]', AI_COLOURS.checkPass.badge)}>
                      <AiSparkleIcon size={12} /> AI checked
                    </span>
                  </div>
                    </Field>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Programme centre" required error={errors.pc}>
                      <Select value={edit.pc} onValueChange={value => setEdit(prev => prev ? { ...prev, pc: value ?? '' } : prev)}>
                        <SelectTrigger aria-label="Programme centre" className={errors.pc ? ERROR_CLS : ''}>
                          <SelectValue placeholder="Select programme centre" />
                        </SelectTrigger>
                        <SelectContent>
                          {PC_CODES.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Intern category" required error={errors.educationLevel}>
                      <Select value={edit.educationLevel} onValueChange={value => setEdit(prev => prev ? { ...prev, educationLevel: value ?? '' } : prev)}>
                        <SelectTrigger aria-label="Intern category" className={errors.educationLevel ? ERROR_CLS : ''}>
                          <SelectValue placeholder="Select intern category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    </div>

                <Field label="Skill set" required error={errors.skills} className="max-w-[66%]">
                  <Combobox
                    selected={edit.skills}
                    onToggle={(opt) => {
                          setEdit(prev => {
                            if (!prev) return prev;
                            const selected = prev.skills;
                            const next = selected.includes(opt)
                              ? selected.filter(s => s !== opt)
                              : selected.length < 3
                                ? [...selected, opt]
                                : selected;
                            return { ...prev, skills: next };
                          });
                        }}
                        options={TECH_DOMAINS}
                        placeholder="Select skill sets…"
                        chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                        chips="inline"
                      />
                    </Field>

                <Field label="Discipline of Study" required error={errors.discipline} className="max-w-[66%]">
                  <Combobox
                    selected={parseDisciplines(edit.discipline)}
                        onToggle={(opt) => setEdit(prev => prev ? { ...prev, discipline: toggleDiscipline(prev.discipline, opt) } : prev)}
                        options={DISCIPLINE_OPTIONS}
                        placeholder="Select disciplines…"
                        chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                        chips="inline"
                      />
                    </Field>
                  </div>
                </div>

                {/* Placements & Timeline */}
                <div>
                  <p className="text-body-sm font-semibold text-fg mb-3">Placements & Timeline</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Project Duration" required error={errors.internshipDuration}>
                      <Select value={edit.internshipDuration} onValueChange={value => setEdit(prev => prev ? { ...prev, internshipDuration: value ?? '' } : prev)}>
                        <SelectTrigger aria-label="Project Duration" className={errors.internshipDuration ? ERROR_CLS : ''}>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Internship Window" required error={errors.internshipWindow}>
                      <DateRangePicker
                        start={isoDay(edit.internshipPeriodStart, false)}
                        end={isoDay(edit.internshipPeriodEnd, true)}
                        placeholder="Select start and end date"
                        onChange={(s, e) => setEdit(prev => prev ? { ...prev, internshipPeriodStart: s, internshipPeriodEnd: e } : prev)}
                      />
                    </Field>

                    <Field label="Number of placements" required error={errors.slots}>
                      <div className="flex items-center gap-3">
                        <div className={cn('inline-flex items-center rounded-lg border bg-surface', errors.slots ? 'border-danger' : 'border-border')}>
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
                    </Field>
                  </div>
                </div>

                {/* Mentors */}
                <div>
                  <p className="text-body-sm font-semibold text-fg mb-3">Mentors</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Primary Mentor Name" required error={errors.mentor}>
                      <input className={cn(INPUT_CLS, errors.mentor && ERROR_CLS)} value={edit.mentor} onChange={e => setEdit(prev => prev ? { ...prev, mentor: e.target.value } : prev)} />
                    </Field>
                    <Field label="Primary Mentor Appointment" required error={errors.mentorAppointment}>
                      <input className={cn(INPUT_CLS, errors.mentorAppointment && ERROR_CLS)} value={edit.mentorAppointment} onChange={e => setEdit(prev => prev ? { ...prev, mentorAppointment: e.target.value } : prev)} />
                    </Field>
                    <Field label="Primary Mentor Email" required error={errors.mentorEmail}>
                      <input className={cn(INPUT_CLS, errors.mentorEmail && ERROR_CLS)} value={edit.mentorEmail} onChange={e => setEdit(prev => prev ? { ...prev, mentorEmail: e.target.value } : prev)} placeholder="name@dsta.gov.sg" />
                    </Field>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Secondary Mentor Name">
                      <input className={INPUT_CLS} value={edit.secondaryMentor} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentor: e.target.value } : prev)} placeholder="Optional" />
                    </Field>
                    <Field label="Secondary Mentor Appointment">
                      <input className={INPUT_CLS} value={edit.secondaryMentorAppointment} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentorAppointment: e.target.value } : prev)} placeholder="Optional" />
                    </Field>
                    <Field label="Secondary Mentor Email" error={errors.secondaryMentorEmail}>
                      <input className={cn(INPUT_CLS, errors.secondaryMentorEmail && ERROR_CLS)} value={edit.secondaryMentorEmail} onChange={e => setEdit(prev => prev ? { ...prev, secondaryMentorEmail: e.target.value } : prev)} placeholder="Optional" />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-6 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-3">
          <Button variant="ghost" size="md" onClick={() => router.push(`/requests/project/${encodeURIComponent(batchId)}/${encodeURIComponent(projId)}`)}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="md" onClick={() => router.push(`/requests/project/${encodeURIComponent(batchId)}/${encodeURIComponent(projId)}`)}>
              Cancel
            </Button>
            <Button size="md" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save changes?</DialogTitle>
            <DialogDescription>
              Your project request will be sent to the Programme Centre for intern placements.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSaveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => { setConfirmSaveOpen(false); doSave(); }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast message={toast} />
    </Shell>
  );
}
