'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/layout/shell';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import { Badge } from '@/components/ui-legacy/badge';
import Button from '@/components/ui-legacy/button';
import Combobox from '@/components/ui-legacy/combobox';
import EmptyState from '@/components/ui-legacy/empty-state';
import RequestContextTable from '@/components/ui-legacy/request-context-table';
import { SortHeader } from '@/components/ui-legacy/sort-header';
import AiCheckBlock from '@/components/ui-legacy/ai-check-block';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
} from '@/components/ui/menu';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Eye,
  Inbox,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadProjectResponseDrafts,
  loadRequests,
  loadSubmissions,
  saveProjectResponseDrafts,
  saveRequests,
  saveSubmissions,
} from '@/lib/storage';
import { addNotification } from '@/lib/notifications';
import { AI_COLOURS } from '@/lib/ai-colours';
import { PROJECT_SUBMISSION_COLUMNS, STATUS_COLOURS, toEducationLevel } from '@/lib/data';
import { DISCIPLINE_OPTIONS, parseDisciplines, toggleDiscipline } from '@/lib/disciplines';
import {
  runAiCheck,
  runPublicProjectCheck,
} from '@/lib/ai-check';
import { periodLabelToMMMYY } from '@/lib/internship-period';
import {
  deadlinePassed,
  findGroup,
  projectMatchesRequest,
  requestRawCategory,
  submittedForGroup,
  groupTotals,
  requestYearLabel,
  type RequestGroup,
} from '@/lib/request-groups';
import { downloadResponseTemplateXlsx } from '@/lib/request-template';
import type { ProjectRequest, ProjectResponseDraft, ProjectSubmissionBatch, RequestStatus, SubmittedProject } from '@/lib/types';

const FLASH_KEY = 'dsta_flash';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UploadReviewIssue = {
  row: number;
  title: string;
  issue: string;
};

type UploadReview = {
  fileName: string;
  allProjects: SubmittedProject[];
  readyProjects: SubmittedProject[];
  issues: UploadReviewIssue[];
};

const INPUT_CLS =
  'w-full rounded-lg border border-border bg-surface shadow-sm px-3 py-2 text-body-md text-fg focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-fg-muted';
const ERROR_CLS = 'border-danger ring-1 ring-danger/30';

const REQUEST_CATEGORY_LABELS: Record<string, string> = {
  University: 'University',
  'Junior College': 'Junior College',
  Polytechnic: 'Polytechnic',
  'Post Junior College': 'Post Junior College / Post Polytechnic',
  'Post Polytechnic': 'Post Junior College / Post Polytechnic',
  'Post Junior College/Post Polytechnic Student': 'Post Junior College / Post Polytechnic',
  'Integrated Programme (IP)': 'Integrated Programme (IP)',
  'Undergraduate Scholar/Merit Scholar': 'Undergraduate Scholar/Merit Scholar',
  'Undergraduate Student': 'Undergraduate Student',
  'Junior College Scholar/Junior College Student': 'JC Scholar/JC Student',
  'Polytechnic Scholar/Polytechnic Student': 'Poly Scholar/Poly Student',
  'Young Defence Scientist Programme': 'YDSP',
  'Tech UP': 'Tech UP',
};

const STATUS_LABELS: Record<SubmittedProject['status'], string> = {
  draft: 'Not submitted',
  pending: 'Pending',
  frozen: 'Frozen',
  approved: 'Approved',
  rejected: 'Rejected',
  returnedForUpdate: 'Returned for Update',
  withdrawn: 'Withdrawn',
};

function categoryLabel(value: string) {
  return REQUEST_CATEGORY_LABELS[value] ?? value;
}

function getDropdown(colName: string): string[] {
  return PROJECT_SUBMISSION_COLUMNS.find(column => column.name === colName)?.dropdownValues ?? [];
}

function requestCategoryLabel(req: ProjectRequest) {
  return categoryLabel(req.internCategory || req.educationLevel);
}

function requestLineKey(req: ProjectRequest, index: number) {
  return req.id || `${req.uploadToken || 'request'}-${requestRawCategory(req)}-${index}`;
}

function requestStatusForGroup(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): { label: string; variant: 'warning' | 'info' | 'success' } {
  const submitted = submittedForGroup(group, batches);
  const hasIssue = submitted.some(p => p.status === 'rejected' || p.status === 'returnedForUpdate');
  const placements = group.requests.reduce((sum, r) => sum + r.placements, 0);
  const uploaded = group.requests.reduce((sum, r) => sum + (r.uploaded ?? 0), 0);

  if (hasIssue) return { label: 'Incomplete', variant: 'warning' };
  if (placements > 0 && uploaded >= placements) return { label: 'Fulfilled', variant: 'success' };
  if (uploaded > 0) return { label: 'Incomplete', variant: 'warning' };
  return { label: 'Pending', variant: 'info' };
}

function requestPeriodForProject(request: ProjectRequest | undefined): { start: string; end: string } {
  if (!request) return { start: '', end: '' };
  const parts = (request.calendarPeriod ?? '')
    .split(/\s*[–-]\s*/)
    .map(part => part.trim())
    .filter(Boolean);
  const start = request.periodStart || parts[0] || '';
  const end = request.periodEnd || parts[1] || parts[0] || '';
  return {
    start: periodLabelToMMMYY(start),
    end: periodLabelToMMMYY(end),
  };
}

function projectPeriod(project: SubmittedProject, request?: ProjectRequest) {
  if (project.calendarPeriod) return project.calendarPeriod;
  const requestPeriod = requestPeriodForProject(request);
  const start = project.internshipPeriodStart || requestPeriod.start || 'Start month';
  const end = project.internshipPeriodEnd || requestPeriod.end || 'End month';
  return `${start} - ${end}`;
}

function projectDuration(project: SubmittedProject) {
  if (!project.internshipDuration) return 'Duration not set';
  return project.internshipDuration.toLowerCase().includes('month')
    ? project.internshipDuration
    : `${project.internshipDuration} months`;
}

type AiCheckResultStatus = 'pass' | 'warn' | 'fail';

function aiCheckStatusLabel(result: AiCheckResultStatus) {
  if (result === 'pass') return 'AI checked';
  return 'AI recommend review';
}

function strongestAiCheckResult(results: Array<AiCheckResultStatus | undefined>, hasNotes = false): AiCheckResultStatus {
  if (results.includes('fail')) return 'fail';
  if (results.includes('warn') || hasNotes) return 'warn';
  return 'pass';
}

function aiCheckMeta(project: SubmittedProject) {
  const checks = [
    project.aiCheck.grammar,
    project.aiCheck.level,
    project.aiCheck.spelling,
    project.aiCheck.publicReadiness,
  ].filter(Boolean);
  const result = strongestAiCheckResult(checks, project.aiCheck.notes.length > 0);
  return {
    result,
    ok: result === 'pass',
    label: aiCheckStatusLabel(result),
  };
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-label-sm text-fg">
        {label}
        {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-caption text-danger">{error}</p>}
    </div>
  );
}

function EditProjectDialog({
  project,
  request,
  mode = 'draft',
  feedback,
  onClose,
  onSave,
}: {
  project: SubmittedProject;
  request?: ProjectRequest;
  mode?: 'draft' | 'resubmit';
  feedback?: string;
  onClose: () => void;
  onSave: (project: SubmittedProject) => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [skills, setSkills] = useState<string[]>(project.skills.slice(0, 3));
  const [discipline, setDiscipline] = useState<string>(project.discipline ?? '');
  const [mentor, setMentor] = useState(project.mentor);
  const [mentorAppointment, setMentorAppointment] = useState(project.mentorAppointment ?? '');
  const [mentorUserId, setMentorUserId] = useState(project.mentorUserId ?? '');
  const [secondaryMentor, setSecondaryMentor] = useState(project.secondaryMentor ?? '');
  const [secondaryMentorAppointment, setSecondaryMentorAppointment] = useState(project.secondaryMentorAppointment ?? '');
  const [secondaryMentorEmail, setSecondaryMentorEmail] = useState(project.secondaryMentorEmail ?? '');
  const [slots, setSlots] = useState(String(project.slots || 1));
  const [pcHeadCleared, setPcHeadCleared] = useState(false);
  const [securityCleared, setSecurityCleared] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const techCompetencyOptions = getDropdown('Tech Domain');
  const programmeCentre = project.pc || request?.programmeCenter || '—';
  const internCategory = request ? requestRawCategory(request) : project.educationLevel ?? '';
  const requiresResubmitChecks = mode === 'resubmit';
  const canSave = !requiresResubmitChecks || (pcHeadCleared && securityCleared);

  function clearError(key: string) {
    setErrors(previous => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = 'Project title is required.';
    if (!description.trim()) nextErrors.description = 'Project scope is required.';
    if (skills.length === 0) nextErrors.skills = 'Select at least one tech competency.';
    if (!mentor.trim()) nextErrors.mentor = 'Primary mentor name is required.';
    if (!mentorAppointment.trim()) nextErrors.mentorAppointment = 'Primary mentor appointment is required.';
    if (!mentorUserId.trim()) nextErrors.mentorUserId = 'Primary mentor email is required.';
    else if (!EMAIL_RE.test(mentorUserId.trim())) nextErrors.mentorUserId = 'Enter a valid email address.';
    if (secondaryMentorEmail.trim() && !EMAIL_RE.test(secondaryMentorEmail.trim())) {
      nextErrors.secondaryMentorEmail = 'Enter a valid email address.';
    }
    const parsedSlots = parseInt(slots, 10);
    if (Number.isNaN(parsedSlots) || parsedSlots < 1) nextErrors.slots = 'At least 1 placement is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const educationLevel = project.educationLevel ?? (request ? toEducationLevel(requestRawCategory(request)) : undefined);
    const nextSkills = skills.filter(Boolean).slice(0, 3);
    onSave({
      ...project,
      title: title.trim(),
      description: description.trim(),
      mentor: mentor.trim(),
      mentorAppointment: mentorAppointment.trim() || undefined,
      mentorUserId: mentorUserId.trim() || undefined,
      secondaryMentor: secondaryMentor.trim() || undefined,
      secondaryMentorAppointment: secondaryMentorAppointment.trim() || undefined,
      secondaryMentorEmail: secondaryMentorEmail.trim() || undefined,
      discipline: discipline.trim() || project.discipline,
      skills: nextSkills,
      slots: parseInt(slots, 10),
      pc: project.pc || request?.programmeCenter || undefined,
      techDomain: nextSkills[0] || project.techDomain,
      educationLevel,
      aiCheck: runPublicProjectCheck(
        title.trim(),
        description.trim(),
        educationLevel ?? '',
        nextSkills,
        nextSkills[0] || project.techDomain || '',
      ),
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4 pr-14">
          <DialogTitle className="text-headline-sm text-fg">Edit Project</DialogTitle>
          <DialogDescription className="sr-only">
            {requiresResubmitChecks
              ? 'Edit the returned project and resubmit it for IO review.'
              : 'Edit the draft project before submitting the request response.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(88vh-132px)] overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            {requiresResubmitChecks && feedback && (
              <div className="rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-warning" />
                  <p className="text-caption font-semibold uppercase tracking-wide text-warning">
                    IO feedback
                  </p>
                </div>
                <p className="text-body-sm text-fg">{feedback}</p>
              </div>
            )}

            {request && (
              <RequestContextTable requests={[request]} title="Placement requirements" />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Programme centre" required>
                <div className={cn(INPUT_CLS, 'flex min-h-9 items-center bg-bg-muted text-fg')}>
                  {programmeCentre}
                </div>
              </FormField>
              <FormField label="Intern category" required>
                <div className={cn(INPUT_CLS, 'flex min-h-9 items-center bg-bg-muted text-fg')}>
                  {internCategory}
                </div>
              </FormField>
            </div>

            <FormField label="Project title" required error={errors.title}>
              <input
                className={cn(INPUT_CLS, errors.title && ERROR_CLS)}
                placeholder="Type a project name, e.g. AI-Driven Threat Detection System"
                value={title}
                onChange={event => { setTitle(event.target.value); clearError('title'); }}
              />
              <AiCheckBlock
                title={title}
                educationLevel={internCategory}
                skills={skills}
              />
            </FormField>

            <FormField label="Project scope" required error={errors.description}>
              <textarea
                rows={5}
                className={cn(INPUT_CLS, 'resize-none', errors.description && ERROR_CLS)}
                placeholder="Interns will work on..."
                value={description}
                onChange={event => { setDescription(event.target.value); clearError('description'); }}
              />
              <AiCheckBlock
                title={title}
                description={description}
                educationLevel={internCategory}
                skills={skills}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tech competency (up to 3)" required error={errors.skills}>
                <Combobox
                  selected={skills}
                  onToggle={(opt) => {
                    const next = skills.includes(opt) ? skills.filter(s => s !== opt) : skills.length < 3 ? [...skills, opt] : skills;
                    setSkills(next);
                    clearError('skills');
                  }}
                  options={techCompetencyOptions}
                  placeholder="Select tech competencies…"
                  chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                  chips="inline"
                />
              </FormField>
              <FormField label="Discipline of Study (up to 3)" required>
                <Combobox
                  selected={parseDisciplines(discipline)}
                  onToggle={(opt) => {
                    setDiscipline((prev) => toggleDiscipline(prev, opt));
                  }}
                  options={DISCIPLINE_OPTIONS}
                  placeholder="Select disciplines…"
                  chipClassName="bg-bg-muted text-[rgba(69,85,108,1)]"
                  chips="inline"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Primary Mentor Name" required error={errors.mentor}>
                <input
                  className={cn(INPUT_CLS, errors.mentor && ERROR_CLS)}
                  value={mentor}
                  onChange={event => { setMentor(event.target.value); clearError('mentor'); }}
                />
              </FormField>
              <FormField label="Primary Mentor Appointment" required error={errors.mentorAppointment}>
                <input
                  className={cn(INPUT_CLS, errors.mentorAppointment && ERROR_CLS)}
                  value={mentorAppointment}
                  onChange={event => { setMentorAppointment(event.target.value); clearError('mentorAppointment'); }}
                />
              </FormField>
              <FormField label="Primary Mentor Email" required error={errors.mentorUserId}>
                <input
                  className={cn(INPUT_CLS, errors.mentorUserId && ERROR_CLS)}
                  value={mentorUserId}
                  onChange={event => { setMentorUserId(event.target.value); clearError('mentorUserId'); }}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Secondary Mentor Name">
                <input
                  className={INPUT_CLS}
                  value={secondaryMentor}
                  onChange={event => setSecondaryMentor(event.target.value)}
                />
              </FormField>
              <FormField label="Secondary Mentor Appointment">
                <input
                  className={INPUT_CLS}
                  value={secondaryMentorAppointment}
                  onChange={event => setSecondaryMentorAppointment(event.target.value)}
                />
              </FormField>
              <FormField label="Secondary Mentor Email" error={errors.secondaryMentorEmail}>
                <input
                  className={cn(INPUT_CLS, errors.secondaryMentorEmail && ERROR_CLS)}
                  value={secondaryMentorEmail}
                  onChange={event => { setSecondaryMentorEmail(event.target.value); clearError('secondaryMentorEmail'); }}
                />
              </FormField>
            </div>

            <FormField label="Number of placements" required error={errors.slots}>
              <input
                type="number"
                min={1}
                className={cn('max-w-32', INPUT_CLS, errors.slots && ERROR_CLS)}
                value={slots}
                onChange={event => { setSlots(event.target.value); clearError('slots'); }}
              />
            </FormField>

            {requiresResubmitChecks && (
              <div className="rounded-lg border border-border bg-bg-subtle px-4 py-3">
                <h3 className="mb-1 text-label-sm font-semibold text-fg">Ready to resubmit?</h3>
                <p className="mb-3 text-body-sm text-fg-muted">
                  Before resubmitting, please confirm both checks below.
                </p>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                    <Checkbox
                      checked={pcHeadCleared}
                      onCheckedChange={(checked) => setPcHeadCleared(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-body-sm font-medium text-fg">Cleared with PC Head</span>
                      <span className="block text-caption text-fg-muted">
                        This project has been reviewed and approved by the Programme Committee Head.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                    <Checkbox
                      checked={securityCleared}
                      onCheckedChange={(checked) => setSecurityCleared(Boolean(checked))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-body-sm font-medium text-fg">Cleared with Security</span>
                      <span className="block text-caption text-fg-muted">
                        This project has been reviewed for security and data protection concerns.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {requiresResubmitChecks ? 'Save and resubmit' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if ('richText' in objectValue) {
      return (objectValue.richText as { text: string }[]).map(item => item.text).join('').trim();
    }
    if ('text' in objectValue) return parseCellValue(objectValue.text);
    if ('hyperlink' in objectValue) return String(objectValue.hyperlink).replace(/^mailto:/i, '').trim();
    if ('result' in objectValue) return parseCellValue(objectValue.result);
    return '';
  }
  return String(value).trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function rowObject(headers: string[], values: string[]) {
  return headers.reduce<Record<string, string>>((object, header, index) => {
    object[header] = (values[index] ?? '').trim();
    return object;
  }, {});
}

function pickValue(values: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    if (values[name]) return values[name];
  }
  const normalized = new Map(
    Object.entries(values).map(([key, value]) => [
      key.toLowerCase().replace(/[\s_-]+/g, ''),
      value,
    ]),
  );
  for (const name of names) {
    const value = normalized.get(name.toLowerCase().replace(/[\s_-]+/g, ''));
    if (value) return value;
  }
  return '';
}

function isPlaceholderUploadTitle(title: string): boolean {
  const normalized = title.trim().replace(/\s+/g, ' ').toLowerCase();
  return /^(empty row|project title|sample project|sample title|enter project title)$/.test(normalized);
}

function projectFromUploadRow(
  values: Record<string, string>,
  index: number,
  defaultCategory: string,
  options: { includeBlankRows?: boolean } = {},
): SubmittedProject | null {
  const rawTitle = pickValue(values, 'Project Title', 'projectTitle').trim();
  const title = isPlaceholderUploadTitle(rawTitle) ? '' : rawTitle;
  if (!title && !options.includeBlankRows) return null;
  const rawCategory = pickValue(values, 'Intern Category', 'Education Level', 'internCategory', 'educationLevel') || defaultCategory;
  const educationLevel = toEducationLevel(rawCategory || defaultCategory);
  const description = pickValue(values, 'Project Scope', 'projectScope') ?? '';
  const rawSkills = pickValue(values, 'Skills / Knowledge Required', 'skills') ?? '';
  const skills = rawSkills.split(',').map(skill => skill.trim()).filter(Boolean);
  const slots = Math.max(1, parseInt(pickValue(values, 'No. of Placements', 'Placements', 'placements') || '1', 10) || 1);
  const techDomain = pickValue(values, 'Tech Domain', 'techDomain') ?? '';
  const periodParts = (pickValue(values, 'Calendar Period', 'Internship Period', 'calendarPeriod', 'internshipPeriod') || '')
    .split(/\s*[–-]\s*/)
    .map(part => part.trim())
    .filter(Boolean);
  const startMonth = pickValue(values, 'Internship Start Month', 'internshipStartMonth') || periodParts[0] || '';
  const endMonth = pickValue(values, 'Internship End Month', 'internshipEndMonth') || periodParts[1] || periodParts[0] || '';
  const calendarPeriod = pickValue(values, 'Calendar Period', 'calendarPeriod', 'internshipPeriod') || (startMonth && endMonth ? `${startMonth} – ${endMonth}` : undefined);

  return {
    id: `sub-inline-${Date.now()}-${index}`,
    title,
    description,
    mentor: pickValue(values, 'Full Name of Main Mentor', 'Primary Mentor Name', 'mentorName') ?? '',
    mentorAppointment: pickValue(values, 'Main Mentor Appointment', 'Primary Mentor Appointment', 'mentorAppointment') || undefined,
    mentorUserId: pickValue(values, 'Main Mentor Email', 'Main Mentor User ID', 'Primary Mentor Email', 'mentorEmail') || undefined,
    secondaryMentor: pickValue(values, 'Secondary Mentor Name', 'secondaryMentorName') || undefined,
    secondaryMentorAppointment: pickValue(values, 'Secondary Mentor Appointment', 'secondaryMentorAppointment') || undefined,
    secondaryMentorEmail: pickValue(values, 'Secondary Mentor Email', 'secondaryMentorEmail') || undefined,
    mentorDept: '',
    mentorBio: pickValue(values, 'Main Mentor Write-up', 'mentorBio') ?? '',
    skills,
    discipline: [
      pickValue(values, 'Discipline of Study 1', 'discipline1'),
      pickValue(values, 'Discipline of Study 2', 'discipline2'),
      pickValue(values, 'Discipline of Study 3', 'discipline3'),
      pickValue(values, 'Discipline of Study', 'discipline'),
    ].filter(Boolean).join(', '),
    slots,
    preferredEducation: 'Any',
    minGpa: '',
    projectType: 'Technical',
    additionalRequirements: '',
    aiCheck: runAiCheck(title, description, educationLevel, skills, techDomain),
    status: 'pending',
    pc: pickValue(values, 'PC', 'programmeCentre', 'programmeCenter') || undefined,
    techDomain: techDomain || undefined,
    emergingArea: pickValue(values, 'Emerging Area', 'emergingArea') || undefined,
    educationLevel,
    internshipDuration: pickValue(values, 'Project Duration', 'Internship Duration', 'Duration', 'duration') || undefined,
    internshipPeriodStart: periodLabelToMMMYY(startMonth),
    internshipPeriodEnd: periodLabelToMMMYY(endMonth),
    calendarPeriod,
    workingLocation: pickValue(values, 'Working Location', 'workingLocation') || undefined,
  };
}

function parseCSVProjects(text: string, defaultCategory: string): SubmittedProject[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(header => header.trim());
  const dataLines = lines.slice(1);
  const rows = dataLines
    .map(line => rowObject(headers, parseCSVLine(line)))
    .filter(row => !isPlaceholderUploadTitle(row['Project Title'] ?? ''));
  return rows
    .map((row, index) => projectFromUploadRow(row, index, defaultCategory))
    .filter((project): project is SubmittedProject => Boolean(project));
}

function projectUploadIssues(project: SubmittedProject): string[] {
  const issues: string[] = [];
  if (!project.title.trim()) issues.push('Project title is required.');
  if (!project.description.trim()) issues.push('Project scope is required.');
  if (project.skills.length < 1) issues.push('At least one tech competency is required.');
  if (!project.mentor.trim()) issues.push('Primary mentor name is required.');
  if (!project.mentorAppointment?.trim()) issues.push('Primary mentor appointment is required.');
  if (!project.mentorUserId?.trim()) {
    issues.push('Primary mentor email is required.');
  } else if (!EMAIL_RE.test(project.mentorUserId)) {
    issues.push('Primary mentor email must be a valid email address.');
  }
  if (!Number.isFinite(project.slots) || project.slots < 1) issues.push('Placements must be at least 1.');
  return issues;
}

function buildUploadReview(fileName: string, projects: SubmittedProject[], group: RequestGroup): UploadReview {
  const readyProjects: SubmittedProject[] = [];
  const issues: UploadReviewIssue[] = [];

  projects.forEach((project, index) => {
    const row = index + 2;
    const title = project.title || `Row ${row}`;
    const matchedRequest = group.requests.find(request => projectMatchesRequest(project, request));
    if (!matchedRequest) {
      issues.push({
        row,
        title,
        issue: 'Does not match this request. Check Intern Category, Internship Window, and Project Duration.',
      });
      return;
    }

    const rowIssues = projectUploadIssues(project);
    if (rowIssues.length > 0) {
      rowIssues.forEach(issue => issues.push({ row, title, issue }));
      return;
    }

    readyProjects.push({
      ...project,
      pc: project.pc ?? matchedRequest.pc,
      requestLineId: matchedRequest.id,
      status: 'draft',
    });
  });

  return { fileName, allProjects: projects, readyProjects, issues };
}

function responseDraftForToken(drafts: ProjectResponseDraft[], requestToken: string): ProjectResponseDraft | null {
  return drafts.find(draft => draft.requestToken === requestToken) ?? null;
}

const ENTRY_ROWS = 3; // structured template: each project entry spans 3 rows

/* Parse the STRUCTURED project-request template (lib/request-template.ts): one tab per
   intern category, a title/instructions banner (rows 1-2), a header row (row 3), then
   3-row project entries with merged single-value cells, stacked Tech/Discipline dropdown
   cells, and a left "Period / Duration" bar per block. Returns null when the workbook
   isn't this structured template (so the caller can fall back to the flat parser). */
function parseStructuredWorkbook(
  workbook: import('exceljs').Workbook,
  defaultCategory: string,
): SubmittedProject[] | null {
  const projects: SubmittedProject[] = [];
  let isStructured = false;

  for (const ws of workbook.worksheets) {
    if (ws.state === 'veryHidden' || /lookups/i.test(ws.name)) continue;
    const headers: string[] = [];
    ws.getRow(3).eachCell({ includeEmpty: true }, (cell, n) => { headers[n - 1] = parseCellValue(cell.value); });
    const idx = (re: RegExp) => headers.findIndex(h => re.test(h ?? ''));
    const cTitle = idx(/project title/i);
    if (cTitle < 0) continue;               // not a structured category tab
    isStructured = true;

    const category = (parseCellValue(ws.getCell('A1').value)
      .replace(/\s*[—-]\s*Internship Project Submission.*$/i, '')
      .replace(/^Intern Category:\s*/i, '')
      .trim()) || defaultCategory;

    const cScope = idx(/project scope/i);
    const cTech = idx(/tech competency|tech domain|skillset/i);
    const cDisc = idx(/discipline/i);
    const cPMName = idx(/primary mentor name|full name of main mentor|main mentor name/i);
    const cPMAppt = idx(/appointment/i);
    const cPMEmail = idx(/primary mentor email|main mentor email/i);
    const cSMName = idx(/secondary mentor name/i);
    const cSMEmail = idx(/secondary mentor email/i);
    const cPlace = idx(/placements|no\. of interns/i);
    const at = (row: number, colIdx: number) => (colIdx >= 0 ? parseCellValue(ws.getCell(row, colIdx + 1).value) : '');
    const rowText = (row: number) => {
      const values: string[] = [];
      ws.getRow(row).eachCell({ includeEmpty: true }, cell => {
        const value = parseCellValue(cell.value);
        if (value) values.push(value);
      });
      return values.join(' ');
    };

    let barPeriod = '', barDuration = '';
    const lastRow = ws.rowCount;
    let r = 4;
    while (r <= lastRow) {
      const text = rowText(r);
      if (/placements filled/i.test(text)) {
        barPeriod = '';
        barDuration = '';
        r += 1;
        continue;
      }
      if (!barPeriod && !text) {
        r += 1;
        continue;
      }
      const barRaw = parseCellValue(ws.getCell(r, 1).value);
      if (barRaw && !/placements filled/i.test(barRaw)) {
        const parts = barRaw.split('\n').map(s => s.trim()).filter(Boolean);
        if (parts[0]) barPeriod = parts[0];
        if (parts[1]) barDuration = parts[1];
      }
      const title = at(r, cTitle).trim();
      if (/^\d+$/.test(title) || (!title && !at(r, cScope) && !at(r, cPlace) && !at(r, cPMName) && !at(r, cPMEmail))) {
        r += 1;
        continue;
      }
      const hasTemplateContext = Boolean(barPeriod || title || at(r, cPlace) || at(r, cScope));
      if (hasTemplateContext && !/^placements filled/i.test(title) && !/^placements filled/i.test(barRaw)) {
        const stack = (colIdx: number) => {
          if (colIdx < 0) return [] as string[];
          const out: string[] = [];
          for (let k = 0; k < ENTRY_ROWS; k++) { const v = at(r + k, colIdx).trim(); if (v && !out.includes(v)) out.push(v); }
          return out;
        };
        const disc = stack(cDisc);
        const techStack = stack(cTech);
        const [pStart, pEnd] = barPeriod.split(/\s*[–-]\s*/);
        const values: Record<string, string> = {
          'Project Title': title,
          'Intern Category': category,
          'Project Scope': at(r, cScope),
          'Tech Domain': techStack[0] ?? '',
          'Skills / Knowledge Required': techStack.join(', '),
          'Discipline of Study 1': disc[0] ?? '',
          'Discipline of Study 2': disc[1] ?? '',
          'Discipline of Study 3': disc[2] ?? '',
          'Full Name of Main Mentor': at(r, cPMName),
          'Main Mentor Appointment': at(r, cPMAppt),
          'Main Mentor Email': at(r, cPMEmail),
          'Secondary Mentor Name': at(r, cSMName),
          'Secondary Mentor Email': at(r, cSMEmail),
          'No. of Placements': at(r, cPlace) || '1',
          'Project Duration': barDuration,
          'Internship Start Month': pStart ?? '',
          'Internship End Month': pEnd ?? pStart ?? '',
        };
        const project = projectFromUploadRow(values, projects.length, category, { includeBlankRows: true });
        if (project) projects.push(project);
        r += ENTRY_ROWS;
      } else {
        r += 1;
      }
    }
  }

  return isStructured ? projects : null;
}

async function parseUploadedProjects(file: File, defaultCategory: string): Promise<SubmittedProject[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') return parseCSVProjects(await file.text(), defaultCategory);

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  // The structured request template (category tabs, 3-row entries) — try it first.
  const structured = parseStructuredWorkbook(workbook, defaultCategory);
  if (structured !== null) return structured;

  // Fallback: flat single-sheet template with headers in row 1.
  const worksheet = workbook.getWorksheet('Project Submission') ?? workbook.worksheets[0];
  if (!worksheet) return [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber - 1] = parseCellValue(cell.value);
  });
  const projects: SubmittedProject[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      values[columnNumber - 1] = parseCellValue(cell.value);
    });
    const object = rowObject(headers, values);
    if (isPlaceholderUploadTitle(object['Project Title'] ?? '')) return;
    const project = projectFromUploadRow(object, projects.length, defaultCategory);
    if (project) projects.push(project);
  });
  return projects;
}

export default function AdPncRespondPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast } = useToast();
  const token = searchParams.get('token') ?? '';
  const mode = searchParams.get('mode') === 'view' ? 'view' : 'upload';

  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [batches, setBatches] = useState<ProjectSubmissionBatch[]>([]);
  const [responseDrafts, setResponseDrafts] = useState<ProjectResponseDraft[]>([]);
  const [createProjectPickerOpen, setCreateProjectPickerOpen] = useState(false);
  const [editingDraftProjectId, setEditingDraftProjectId] = useState<string | null>(null);
  const [editingSubmittedProject, setEditingSubmittedProject] = useState<{ batchId: string; projectId: string } | null>(null);
  const [uploadReview, setUploadReview] = useState<UploadReview | null>(null);
  const [pcCleared, setPcCleared] = useState(false);
  const [securityCleared, setSecurityCleared] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FLASH_KEY);
      if (raw) {
        sessionStorage.removeItem(FLASH_KEY);
        const { message, tone } = JSON.parse(raw);
        if (message) showToast(message, tone ?? 'success');
      }
    } catch {}
    setRequests(loadRequests());
    setBatches(loadSubmissions());
    setResponseDrafts(loadProjectResponseDrafts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const group = token ? findGroup(requests, token) : null;
  const deadlineLocked = group ? deadlinePassed(group.deadline) : false;
  const requestOptions = useMemo(
    () => group?.requests.map((request, index) => ({
      key: requestLineKey(request, index),
      request,
      label: requestOptionLabel(request),
    })) ?? [],
    [group],
  );

  const submittedProjects = group ? submittedForGroup(group, batches) : [];
  const isUploadMode = mode === 'upload';
  const responseDraft = responseDraftForToken(responseDrafts, token);
  const draftProjects = responseDraft?.projects ?? [];
  const editingDraftProject = editingDraftProjectId
    ? draftProjects.find(project => project.id === editingDraftProjectId) ?? null
    : null;
  const editingSubmittedBatch = editingSubmittedProject
    ? batches.find(batch => batch.id === editingSubmittedProject.batchId) ?? null
    : null;
  const editingSubmittedProjectRow = editingSubmittedProject
    ? editingSubmittedBatch?.projects.find(project => project.id === editingSubmittedProject.projectId) ?? null
    : null;
  const visibleProjects = isUploadMode ? draftProjects : submittedProjects;

  // Distinct intern categories from the request group, used to place projects in buckets.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const request of group?.requests ?? []) {
      const category = requestRawCategory(request);
      if (category && !seen.has(category)) { seen.add(category); list.push(category); }
    }
    return list;
  }, [group]);

  // Which category a project belongs to: its matched request's category (requestLineId
  // is the precise link), else a fall back to matching by education level.
  function projectCategoryKey(project: SubmittedProject): string {
    if (project.requestLineId) {
      const linked = group?.requests.find(request => request.id === project.requestLineId);
      if (linked) return requestRawCategory(linked);
    }
    const matched = group?.requests.find(request => projectMatchesRequest(project, request));
    if (matched) return requestRawCategory(matched);
    const byLevel = categories.find(category => toEducationLevel(category) === toEducationLevel(project.educationLevel ?? ''));
    return byLevel ?? categories[0] ?? '';
  }

  const groupedProjects = useMemo(() => {
    const map = new Map<string, SubmittedProject[]>();
    for (const project of visibleProjects) {
      const key = projectCategoryKey(project);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(project);
    }
    const groups = Array.from(map.entries()).map(([key, projects]) => ({
      key,
      label: categoryLabel(key) || 'Uncategorised',
      count: projects.length,
      projects,
    }));
    groups.sort((a, b) => {
      const ai = categories.indexOf(a.key);
      const bi = categories.indexOf(b.key);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
    return groups;
  }, [visibleProjects, group, categories]);

  const sortedProjects = useMemo(() => {
    if (!sortCol || visibleProjects.length === 0) return visibleProjects;
    const getValue = (p: SubmittedProject, col: string) => {
      const matched = group?.requests.find(request => projectMatchesRequest(p, request));
      switch (col) {
        case 'category': return projectCategoryKey(p);
        case 'title': return p.title.toLowerCase();
        case 'dates': return p.internshipPeriodStart || projectPeriod(p, matched).toLowerCase();
        case 'duration': {
          const durationStr = projectDuration(p);
          const match = durationStr.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        }
        case 'slots': return p.slots;
        case 'mentor': return (p.mentor || '').toLowerCase();
        case 'aiStatus': {
          const meta = aiCheckMeta(p);
          return meta.result === 'pass' ? 0 : meta.result === 'warn' ? 1 : 2;
        }
        case 'status': return p.status;
        default: return p.title.toLowerCase();
      }
    };
    return [...visibleProjects].sort((a, b) => {
      const av = getValue(a, sortCol);
      const bv = getValue(b, sortCol);
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return a.title.localeCompare(b.title);
    });
  }, [visibleProjects, sortCol, sortDir, group, categories]);

  const activeVisibleProjects = activeSubmittedProjects(visibleProjects);
  const selectedSubmittableProjects = activeVisibleProjects.filter(p => selectedProjectIds.has(p.id));
  const canSubmit = selectedSubmittableProjects.length > 0 && pcCleared && securityCleared && !deadlineLocked;

  const requestStatus = group ? requestStatusForGroup(group, batches) : null;
  const requestYear = group ? requestYearLabel(group) : '';
  const breadcrumbLabel = useMemo(() => {
    if (!group) return '';
    if (isUploadMode) return visibleProjects.length === 0 ? 'Update' : 'Continue Submission';
    return visibleProjects.some(p => p.status === 'returnedForUpdate') ? 'Update returned project' : 'Request Project';
  }, [group, isUploadMode, visibleProjects]);

  const allSelectedCount = visibleProjects.filter(p => selectedProjectIds.has(p.id)).length;
  const allVisibleSelected = visibleProjects.length > 0 && allSelectedCount === visibleProjects.length;

  function toggleSelectAll() {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleProjects.forEach(p => next.delete(p.id));
      } else {
        visibleProjects.forEach(p => next.add(p.id));
      }
      return next;
    });
  }

  function toggleSelectGroup(groupProjects: SubmittedProject[]) {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      const allSelected = groupProjects.every(p => next.has(p.id));
      if (allSelected) {
        groupProjects.forEach(p => next.delete(p.id));
      } else {
        groupProjects.forEach(p => next.add(p.id));
      }
      return next;
    });
  }

  function toggleGroupCollapse(key: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleProjectSelection(projectId: string) {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  function doSort(col: string) {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 1 ? -1 : 1);
        return prev;
      }
      setSortDir(1);
      return col;
    });
  }

  function activeSubmittedProjects(projects: SubmittedProject[]) {
    return projects.filter(project => project.status !== 'withdrawn');
  }

  function withdrawProject(projectId: string) {
    if (deadlineLocked) return;
    const withdrawnAt = new Date().toISOString();
    const updated = batches.map(batch => batch.uploadToken !== token ? batch : {
        ...batch,
        projects: batch.projects.map(project => project.id === projectId
          ? { ...project, status: 'withdrawn' as const, remarks: undefined, withdrawnAt, withdrawnBy: batch.submittedBy ?? batch.pcHead }
          : project),
      });
    const updatedRequests = requestsFromBatches(updated);
    setBatches(updated);
    setRequests(updatedRequests);
    saveSubmissions(updated);
    saveRequests(updatedRequests);
  }

  function requestsFromBatches(updatedBatches: ProjectSubmissionBatch[]) {
    return requests.map(request => {
      if (request.uploadToken !== token) return request;
      const matchingProjects = activeSubmittedProjects(
        updatedBatches
          .filter(batch => batch.uploadToken === token)
          .flatMap(batch => batch.projects)
          .filter(project => projectMatchesRequest(project, request)),
      );
      const nextUploaded = matchingProjects.reduce((sum, project) => sum + project.slots, 0);
      const nextStatus: RequestStatus =
        nextUploaded > request.placements
          ? 'excess'
          : nextUploaded === request.placements
            ? 'matched'
            : nextUploaded > 0
              ? 'partial'
              : 'pending';
      return {
        ...request,
        uploaded: nextUploaded,
        created: matchingProjects.length,
        status: nextStatus,
      };
    });
  }

  function triggerUpload() {
    fileInputRef.current?.click();
  }

  async function handleDownloadTemplate() {
    if (!group) return;
    try {
      await downloadResponseTemplateXlsx(group.requests);
    } catch {
      showToast('Could not download the template. Please try again.', 'danger');
    }
  }

  function saveResponseDraftProjects(projects: SubmittedProject[]) {
    const nextDraft: ProjectResponseDraft = {
      id: responseDraft?.id ?? `response-draft-${Date.now()}`,
      requestToken: token,
      savedAt: new Date().toISOString(),
      projects,
    };
    const updatedDrafts = [nextDraft, ...responseDrafts.filter(draft => draft.requestToken !== token)];
    setResponseDrafts(updatedDrafts);
    saveProjectResponseDrafts(updatedDrafts);
  }

  function deleteDraftProject(projectId: string) {
    if (deadlineLocked) return;
    saveResponseDraftProjects(draftProjects.filter(project => project.id !== projectId));
  }

  function updateDraftProject(project: SubmittedProject) {
    if (deadlineLocked) return;
    saveResponseDraftProjects(draftProjects.map(item => item.id === project.id ? project : item));
    setEditingDraftProjectId(null);
    showToast('Project draft updated.');
  }

  function resubmitProject(project: SubmittedProject) {
    if (deadlineLocked || !editingSubmittedProject) return;
    const resubmittedAt = new Date().toISOString();
    const updatedBatches = batches.map(batch => batch.id !== editingSubmittedProject.batchId ? batch : {
      ...batch,
      projects: batch.projects.map(item => item.id !== editingSubmittedProject.projectId ? item : {
        ...project,
        status: 'pending' as const,
        remarks: undefined,
        resubmittedAt,
        resubmittedBy: batch.submittedBy ?? batch.pcHead,
      }),
    });
    const updatedRequests = requestsFromBatches(updatedBatches);
    setBatches(updatedBatches);
    setRequests(updatedRequests);
    setEditingSubmittedProject(null);
    saveSubmissions(updatedBatches);
    saveRequests(updatedRequests);
    addNotification({
      forRole: 'io',
      title: `Project resubmitted — ${project.title}`,
      body: `AD (P&C) has resubmitted "${project.title}" after revision. Ready for IO review.`,
      href: '/projects',
      tier: 'action',
    });
    showToast(`"${project.title}" resubmitted for IO review.`);
  }

  function handleSubmitResponse() {
    if (!group || !canSubmit) return;
    const submittedAt = new Date().toISOString();
    const submittedBy = 'Ng Shu Qi';
    const submitProjects = selectedSubmittableProjects.map(project => ({ ...project, status: 'pending' as const, submittedAt, submittedBy }));
    const defaultCategory = group.requests[0] ? requestRawCategory(group.requests[0]) : '';
    const batch: ProjectSubmissionBatch = {
      id: `batch-inline-${Date.now()}`,
      uploadToken: token,
      pc: 'shuqi.ng@dsta.gov.sg',
      pcHead: submittedBy,
      submittedBy,
      programme: '',
      educationLevel: submitProjects[0]?.educationLevel ?? toEducationLevel(defaultCategory),
      requestedEducationLevels: group.requests.map(request => toEducationLevel(request.internCategory || request.educationLevel)),
      placements: group.requests.reduce((sum, request) => sum + request.placements, 0),
      uploadedAt: new Date().toISOString().split('T')[0],
      projects: submitProjects,
    };
    const updatedBatches = [batch, ...batches];
    const updatedRequests = requestsFromBatches(updatedBatches);
    const updatedDrafts = responseDrafts.filter(draft => draft.requestToken !== token);
    setBatches(updatedBatches);
    setRequests(updatedRequests);
    setResponseDrafts(updatedDrafts);
    setPcCleared(false);
    setSecurityCleared(false);
    saveSubmissions(updatedBatches);
    saveRequests(updatedRequests);
    saveProjectResponseDrafts(updatedDrafts);
    try {
      sessionStorage.setItem(FLASH_KEY, JSON.stringify({
        message: `${submitProjects.length} project${submitProjects.length !== 1 ? 's' : ''} submitted for review.`,
        tone: 'success',
      }));
      sessionStorage.setItem('dsta_submissions_success_dialog', '1');
    } catch {}
    router.push('/submissions');
  }


  function requestOptionLabel(request: ProjectRequest) {
    const parts = [
      requestRawCategory(request),
      request.calendarPeriod,
      request.duration,
      `${request.placements} placement${request.placements === 1 ? '' : 's'}`,
    ].filter(Boolean);
    return parts.join(' · ');
  }

  function createProjectForRequest(request: ProjectRequest) {
    if (deadlineLocked) return;
    const params = new URLSearchParams({ token });
    params.set('category', requestRawCategory(request));
    if (request.id) params.set('requestId', request.id);
    router.push(`/projects/new?${params.toString()}`);
  }

  function handleCreateProject() {
    if (!group || deadlineLocked) return;
    if (group.requests.length === 1) {
      createProjectForRequest(group.requests[0]);
      return;
    }
    setCreateProjectPickerOpen(true);
  }

  async function handleUploadFile(file: File | undefined) {
    if (!file || !group || deadlineLocked) return;
    const defaultCategory = group.requests[0] ? requestRawCategory(group.requests[0]) : '';
    try {
      const projects = await parseUploadedProjects(file, defaultCategory);
      if (projects.length === 0) {
        showToast('No project rows found in the file.', 'warning');
        return;
      }
      setUploadReview(buildUploadReview(file.name, projects, group));
    } catch {
      showToast('Could not read the file. Check the format and try again.', 'danger');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function confirmUploadImport() {
    if (deadlineLocked || !uploadReview || uploadReview.issues.length > 0 || uploadReview.readyProjects.length === 0) return;
    saveResponseDraftProjects([...draftProjects, ...uploadReview.readyProjects]);
    const importedCategories = new Set(
      uploadReview.readyProjects.map(project => {
        const matched = group?.requests.find(
          request => request.id === project.requestLineId || projectMatchesRequest(project, request)
        );
        return (matched ? requestRawCategory(matched) : undefined) || project.educationLevel || 'Unknown';
      })
    );
    const categoriesCount = importedCategories.size;
    const projectCount = uploadReview.readyProjects.length;
    showToast(
      `The projects have been added across ${categoriesCount} Intern Categor${categoriesCount !== 1 ? 'ies' : 'y'}.`,
      'success',
      `${projectCount} project${projectCount !== 1 ? 's' : ''} uploaded successfully`
    );
    setUploadReview(null);
  }

  function requestForDemoProject(project: SubmittedProject): ProjectRequest | undefined {
    if (!group) return undefined;
    return (
      group.requests.find(request => projectMatchesRequest(project, request)) ??
      group.requests.find(request => toEducationLevel(requestRawCategory(request)) === toEducationLevel(project.educationLevel ?? '')) ??
      group.requests[0]
    );
  }

  function demoProjectFromUpload(project: SubmittedProject, index: number): SubmittedProject {
    const matchedRequest = requestForDemoProject(project);
    const category = matchedRequest ? requestRawCategory(matchedRequest) : project.educationLevel ?? '';
    const educationLevel = toEducationLevel(category || project.educationLevel || 'University');
    const requestPeriod = matchedRequest ? requestPeriodForProject(matchedRequest) : { start: '', end: '' };
    const title = project.title.trim() || `Demo Project ${index + 1}`;
    const description = project.description.trim() ||
      `Interns will support ${title} by learning the project context, completing guided tasks, and preparing a short summary of findings and outcomes.`;
    const fallbackSkills = [project.techDomain, 'Application Development'].filter((skill): skill is string => Boolean(skill));
    const skills = project.skills.length > 0
      ? project.skills
      : fallbackSkills.slice(0, 1);
    const mentor = project.mentor.trim() || `Demo Mentor ${index + 1}`;
    const mentorAppointment = project.mentorAppointment?.trim() || 'Senior Engineer';
    const mentorUserId = project.mentorUserId?.trim() && EMAIL_RE.test(project.mentorUserId)
      ? project.mentorUserId.trim()
      : `demo.mentor${index + 1}@dsta.gov.sg`;
    const internshipDuration = project.internshipDuration || matchedRequest?.duration;
    const internshipPeriodStart = project.internshipPeriodStart || requestPeriod.start;
    const internshipPeriodEnd = project.internshipPeriodEnd || requestPeriod.end;

    return {
      ...project,
      id: `demo-draft-${Date.now()}-${index}`,
      title,
      description,
      mentor,
      mentorAppointment,
      mentorUserId,
      skills,
      slots: Number.isFinite(project.slots) && project.slots > 0 ? project.slots : 1,
      pc: project.pc || matchedRequest?.pc,
      requestLineId: matchedRequest?.id,
      status: 'draft',
      educationLevel,
      internshipDuration,
      internshipPeriodStart,
      internshipPeriodEnd,
      aiCheck: runAiCheck(title, description, educationLevel, skills, project.techDomain ?? ''),
    };
  }

  function importDemoUploadDrafts() {
    if (deadlineLocked || !uploadReview || uploadReview.allProjects.length === 0) return;
    const demoProjects = uploadReview.allProjects.map(demoProjectFromUpload);
    saveResponseDraftProjects([...draftProjects, ...demoProjects]);
    showToast(`${demoProjects.length} demo project${demoProjects.length !== 1 ? 's' : ''} added as draft.`);
    setUploadReview(null);
  }

  return (
    <Shell activeRoute="/submissions" hideNavigation>
      {!group ? (
        <>
          <div className="rounded-lg border border-border bg-surface">
            <EmptyState
              icon={Inbox}
              title="Request not found"
              description="Return to Project Requests and choose an available request."
              size="sm"
            />
          </div>
          <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-end gap-3 border-t border-border bg-bg-subtle px-[clamp(24px,2.6vw,40px)] py-2">
            <Button variant="outline" size="md" onClick={() => router.push('/submissions')}>Back to Project Requests</Button>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <nav className="mb-3 flex items-center gap-2 text-body-sm text-fg-muted">
              <button type="button" onClick={() => router.push('/submissions')} className="hover:text-accent">
                Project request
              </button>
              <ChevronRight size={14} className="text-fg-subtle" />
              <span className="font-medium text-fg">{breadcrumbLabel}</span>
            </nav>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-headline-lg text-fg mb-1">Request for {requestYear} Projects</h1>
                </div>
                <p className="text-body-sm text-fg-muted">
                  {visibleProjects.length} project{visibleProjects.length !== 1 ? 's' : ''} · {selectedProjectIds.size} selected across tabs
                </p>
              </div>
              {isUploadMode && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleDownloadTemplate} disabled={!group}>
                    <Download size={15} />
                    Download Template
                  </Button>
                  <Button variant="outline" onClick={triggerUpload} disabled={deadlineLocked}>
                    <Upload size={15} />
                    Upload excel
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={event => handleUploadFile(event.target.files?.[0])}
                  />
                  <Button onClick={handleCreateProject} disabled={deadlineLocked}>
                    <Plus size={15} />
                    Create a New Project
                  </Button>
                </div>
              )}
            </div>
          </div>

          {deadlineLocked && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <p className="text-body-sm font-medium text-fg">Response deadline has passed</p>
                <p className="text-body-sm text-fg-muted">
                  This request is closed — projects can no longer be added, edited, or submitted.
                </p>
              </div>
            </div>
          )}

          {/* Request Context */}
          <div className="rounded-lg border border-border bg-surface p-5">
            <RequestContextTable requests={group.requests} title="Placement requirements" batches={batches} />
          </div>

          {visibleProjects.length === 0 ? (
            <div className="min-h-[calc(100vh-390px)]">
              <EmptyProjectsCard
                isUploadMode={isUploadMode}
                onUpload={triggerUpload}
                disabled={deadlineLocked}
              />
            </div>
          ) : (
            <div className="flex min-h-[calc(100vh-390px)] flex-col gap-4">
              <section className="flex-1 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-body-sm text-fg">
                      Select all
                    </label>
                  </div>
                  <div className="flex items-center rounded-lg border border-border p-1">
                    <button
                      type="button"
                      aria-label="Grid view"
                      aria-pressed={viewMode === 'grid'}
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'rounded p-1.5 transition-colors',
                        viewMode === 'grid' ? 'bg-bg-subtle text-fg' : 'text-fg-muted hover:text-fg'
                      )}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="List view"
                      aria-pressed={viewMode === 'list'}
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'rounded p-1.5 transition-colors',
                        viewMode === 'list' ? 'bg-bg-subtle text-fg' : 'text-fg-muted hover:text-fg'
                      )}
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {visibleProjects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-body-sm text-fg-muted">
                    No projects yet.
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-surface">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 px-3 py-2">
                            <Checkbox
                              id="select-all-list"
                              checked={allVisibleSelected}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Intern Category" colId="category" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Project" colId="title" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Dates" colId="dates" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Duration" colId="duration" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Placement" colId="slots" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Mentor" colId="mentor" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2">AI Status</TableHead>
                          <TableHead className="px-3 py-2">
                            <SortHeader label="Submission Status" colId="status" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                          </TableHead>
                          <TableHead className="px-3 py-2 text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedProjects.map(project => {
                          const batch = batches.find(item => item.uploadToken === token && item.projects.some(row => row.id === project.id));
                          const matchedRequest = group.requests.find(request => projectMatchesRequest(project, request));
                          const isSelected = selectedProjectIds.has(project.id);
                          const category = categoryLabel(projectCategoryKey(project));
                          return (
                            <ProjectListRow
                              key={project.id}
                              project={project}
                              request={matchedRequest}
                              category={category}
                              batchId={isUploadMode ? undefined : batch?.id}
                              selected={isSelected}
                              onToggleSelect={() => toggleProjectSelection(project.id)}
                                    canManage={!deadlineLocked}
                              onViewDetails={batch?.id ? () => router.push(`/submissions/project/${encodeURIComponent(batch.id)}/${encodeURIComponent(project.id)}`) : undefined}
                              onEdit={() => {
                                if (isUploadMode) {
                                  setEditingDraftProjectId(project.id);
                                  return;
                                }
                                if (batch?.id) {
                                  router.push(`/submissions/edit/${encodeURIComponent(batch.id)}/${encodeURIComponent(project.id)}`);
                                }
                              }}
                              onDelete={() => deleteDraftProject(project.id)}
                              onWithdraw={() => withdrawProject(project.id)}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-surface overflow-hidden">
                    {groupedProjects.map((groupItem, index) => {
                      const isCollapsed = collapsedGroups.has(groupItem.key);
                      const allGroupSelected = groupItem.projects.length > 0 && groupItem.projects.every(p => selectedProjectIds.has(p.id));
                      return (
                        <section key={groupItem.key}>
                          <div className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={allGroupSelected}
                                onCheckedChange={() => toggleSelectGroup(groupItem.projects)}
                                aria-label={`Select all in ${groupItem.label}`}
                              />
                              <span className="text-body-sm font-semibold text-fg">
                                {groupItem.label} ({groupItem.count})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleGroupCollapse(groupItem.key)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
                              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                            >
                              {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                          </div>
                          {!isCollapsed && (
                            <div className={cn('grid gap-4 px-4 pb-4', 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
                              {groupItem.projects.map(project => {
                                const batch = batches.find(item => item.uploadToken === token && item.projects.some(row => row.id === project.id));
                                const matchedRequest = group.requests.find(request => projectMatchesRequest(project, request));
                                const isSelected = selectedProjectIds.has(project.id);
                                return (
                                  <ProjectCard
                                    key={project.id}
                                    project={project}
                                    request={matchedRequest}
                                    batchId={isUploadMode ? undefined : batch?.id}
                                    selected={isSelected}
                                    onToggleSelect={() => toggleProjectSelection(project.id)}
                              canManage={!deadlineLocked}
                                    onViewDetails={batch?.id ? () => router.push(`/submissions/project/${encodeURIComponent(batch.id)}/${encodeURIComponent(project.id)}`) : undefined}
                                    onEdit={() => {
                                      if (isUploadMode) {
                                        setEditingDraftProjectId(project.id);
                                        return;
                                      }
                                      if (batch?.id) {
                                        router.push(`/submissions/edit/${encodeURIComponent(batch.id)}/${encodeURIComponent(project.id)}`);
                                      }
                                    }}
                                    onDelete={() => deleteDraftProject(project.id)}
                                    onWithdraw={() => withdrawProject(project.id)}
                                  />
                                );
                              })}
                            </div>
                          )}
                          {index < groupedProjects.length - 1 && (
                            <div className="h-px bg-border mx-4" aria-hidden="true" />
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </section>

              {isUploadMode && (
                <section className="border-t px-5 py-5">
                  <h2 className="text-label-lg font-semibold text-fg">Submission declaration</h2>
                  <p className="text-body-sm text-fg-muted mt-1">
                    Please complete all required steps and select all checkboxes below before submitting the projects to HR.
                  </p>
                  <div className="mt-4 space-y-3">
                    <CheckRow
                      checked={pcCleared}
                      disabled={deadlineLocked}
                      title="PC Head approval obtained"
                      description="I confirm that all projects have been reviewed and approved by the Programme Centre Head."
                      onCheckedChange={setPcCleared}
                    />
                    <CheckRow
                      checked={securityCleared}
                      disabled={deadlineLocked}
                      title="Security review completed"
                      description="I confirm that all projects have been reviewed for security and data protection considerations."
                      onCheckedChange={setSecurityCleared}
                    />
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-2">
            <p className="text-body-sm text-fg"></p>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="md" onClick={() => router.push('/submissions')}>
                Cancel
              </Button>
              {isUploadMode && visibleProjects.length >= 0 && (
                <>
                  <Button variant="outline" size="md" onClick={() => router.push('/submissions')}>Save and Exit</Button>
                  <Button size="md" disabled={!canSubmit} onClick={() => setConfirmSubmitOpen(true)}>
                    Submit
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit project response?</DialogTitle>
            <DialogDescription>
              {selectedSubmittableProjects.length > 0
                ? `This will submit ${selectedSubmittableProjects.length} project${selectedSubmittableProjects.length !== 1 ? 's' : ''} for IO review.`
                : 'This will submit the project response for IO review.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSubmitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setConfirmSubmitOpen(false); handleSubmitResponse(); }} disabled={deadlineLocked}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {createProjectPickerOpen && (
        <Modal open onClose={() => setCreateProjectPickerOpen(false)} maxWidth="lg" labelledBy="select-request-line-title">
          <h2 id="select-request-line-title" className="mb-2 text-headline-sm text-fg">
            Select request requirement
          </h2>
          <p className="mb-4 text-body-sm text-fg-muted">
            Choose which request requirement this project will respond to.
          </p>
          <div className="space-y-2">
            {requestOptions.map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => createProjectForRequest(option.request)}
                className="flex w-full items-start justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-subtle focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-fg">{requestRawCategory(option.request)}</span>
                  <span className="mt-0.5 block text-caption text-fg-muted">
                    {[option.request.calendarPeriod, option.request.duration].filter(Boolean).join(' · ') || 'No period specified'}
                  </span>
                </span>
                <span className="shrink-0 text-caption font-medium text-fg-muted">
                  {option.request.placements} placement{option.request.placements === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => setCreateProjectPickerOpen(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
      {editingDraftProject && (
        <EditProjectDialog
          project={editingDraftProject}
          request={group?.requests.find(request => projectMatchesRequest(editingDraftProject, request))}
          onClose={() => setEditingDraftProjectId(null)}
          onSave={updateDraftProject}
        />
      )}
      {editingSubmittedProjectRow && (
        <EditProjectDialog
          project={editingSubmittedProjectRow}
          request={group?.requests.find(request => projectMatchesRequest(editingSubmittedProjectRow, request))}
          mode="resubmit"
          feedback={editingSubmittedProjectRow.remarks}
          onClose={() => setEditingSubmittedProject(null)}
          onSave={resubmitProject}
        />
      )}
      {uploadReview && (
        <UploadSummaryDialog
          review={uploadReview}
          onClose={() => setUploadReview(null)}
          onImport={confirmUploadImport}
          onImportDemo={importDemoUploadDrafts}
        />
      )}
      <Toast message={toast} />
    </Shell>
  );
}

function UploadSummaryDialog({
  review,
  onClose,
  onImport,
  onImportDemo,
}: {
  review: UploadReview;
  onClose: () => void;
  onImport: () => void;
  onImportDemo: () => void;
}) {
  const canImport = review.readyProjects.length > 0 && review.issues.length === 0;
  const issueRows = new Set(review.issues.map(issue => issue.row)).size;
  const canImportDemo = review.allProjects.length > 0;

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function doSort(col: string) {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 1 ? -1 : 1);
        return prev;
      }
      setSortDir(1);
      return col;
    });
  }

  const sortedReadyProjects = useMemo(() => {
    if (!sortCol || review.readyProjects.length === 0) return review.readyProjects;
    const getValue = (project: SubmittedProject, col: string) => {
      switch (col) {
        case 'title': return project.title.toLowerCase();
        case 'pc': return (project.pc || '').toLowerCase();
        case 'slots': return project.slots;
        default: return '';
      }
    };
    return [...review.readyProjects].sort((a, b) => {
      const av = getValue(a, sortCol);
      const bv = getValue(b, sortCol);
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });
  }, [review.readyProjects, sortCol, sortDir]);

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4 pr-14">
          <DialogTitle className="text-headline-sm text-fg">Upload summary</DialogTitle>
          <DialogDescription>
            Review the Excel import before creating project drafts.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-border bg-bg-subtle p-4">
            <p className="text-body-sm font-semibold text-fg">{review.fileName}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SummaryTile label="Ready to import" value={review.readyProjects.length} valueClassName="text-success" />
              <SummaryTile label="Rows with issues" value={issueRows} valueClassName={issueRows ? 'text-danger' : 'text-success'} />
            </div>
          </div>

          {review.issues.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-danger" />
                <h3 className="text-label-md font-semibold text-fg">Issues Found</h3>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-body-sm">
                  <thead className="bg-bg-subtle text-caption text-fg-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Project</th>
                      <th className="px-3 py-2 font-medium">Issue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {review.issues.map((issue, index) => (
                      <tr key={`${issue.row}-${issue.issue}-${index}`}>
                        <td className="px-3 py-2 text-fg-muted tabular-nums">{issue.row}</td>
                        <td className="px-3 py-2 font-medium text-fg">{issue.title}</td>
                        <td className="px-3 py-2 text-fg-muted">{issue.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-caption text-fg-muted">
                Fix the Excel and upload again. Drafts will not be created until all rows pass validation.
              </p>
            </section>
          ) : (
            <section>
              <h3 className="mb-2 text-label-md font-semibold text-fg">Ready to import</h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortHeader label="Project" colId="title" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      </TableHead>
                      <TableHead>
                        <SortHeader label="Programme Centre" colId="pc" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      </TableHead>
                      <TableHead className="text-right">
                        <SortHeader label="Placements" colId="slots" sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReadyProjects.map(project => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <span className="block truncate text-body-sm font-medium text-fg">{project.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-body-sm text-fg">{project.pc || '—'}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-body-sm text-fg">{project.slots} placement{project.slots !== 1 ? 's' : ''}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </div>
        <DialogFooter className="border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onImport} disabled={!canImport}>
            Import as drafts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-caption text-fg-muted">{label}</p>
      <p className={cn('mt-1 text-label-lg font-semibold text-fg tabular-nums', valueClassName)}>{value}</p>
    </div>
  );
}

function EmptyProjectsCard({ isUploadMode, onUpload, disabled }: { isUploadMode: boolean; onUpload: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <EmptyState
        icon={Inbox}
        title="No projects yet"
        description={
          isUploadMode
            ? 'Add projects one by one, or upload the completed Excel template to bring in many at once.'
            : 'Uploaded projects for this request will appear here.'
        }
        action={isUploadMode ? (
          <Button variant="outline" size="sm" onClick={onUpload} disabled={disabled}>
            <Upload size={14} />
            Upload Excel
          </Button>
        ) : undefined}
        size="sm"
      />
    </div>
  );
}

function ProjectListRow({
  project,
  request,
  category,
  batchId,
  selected,
  onToggleSelect,
  canManage,
  onViewDetails,
  onEdit,
  onDelete,
  onWithdraw,
}: {
  project: SubmittedProject;
  request?: ProjectRequest;
  category: string;
  batchId?: string;
  selected: boolean;
  onToggleSelect: () => void;
  canManage: boolean;
  onViewDetails?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onWithdraw: () => void;
}) {
  const statusLabel = STATUS_LABELS[project.status] ?? STATUS_LABELS.pending;
  const statusCls = STATUS_COLOURS[project.status] ?? STATUS_COLOURS.pending;
  const aiMeta = aiCheckMeta(project);
  const showAiMeta = project.status !== 'approved' && project.status !== 'withdrawn';
  const canEdit = canManage && (project.status === 'draft' || (Boolean(batchId) && (project.status === 'returnedForUpdate' || project.status === 'withdrawn')));
  const canDelete = canManage && project.status === 'draft';
  const canWithdraw = canManage && project.status === 'pending';
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell className="w-10 px-3 py-2.5">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select ${project.title || 'Untitled project'}`}
          />
        </TableCell>
        <TableCell className="px-3 py-2.5 text-body-sm text-fg">{category}</TableCell>
        <TableCell className="px-3 py-2.5">
          <span className="text-body-sm font-medium text-fg">{project.title || 'Untitled project'}</span>
        </TableCell>
        <TableCell className="px-3 py-2.5 text-body-sm text-fg">{projectPeriod(project, request)}</TableCell>
        <TableCell className="px-3 py-2.5 text-body-sm text-fg">{projectDuration(project)}</TableCell>
        <TableCell className="px-3 py-2.5 text-body-sm text-fg">
          {project.slots} placement{project.slots !== 1 ? 's' : ''}
        </TableCell>
        <TableCell className="px-3 py-2.5 text-body-sm text-fg">{project.mentor || '—'}</TableCell>
        <TableCell className="px-3 py-2.5">
          {showAiMeta ? (
            aiMeta.result === 'pass' ? (
              <span className={cn('badge inline-flex items-center gap-1 text-caption font-normal', AI_COLOURS.checkPass.badge)}>
                <AiSparkleIcon size={12} />
                <span className={AI_COLOURS.checkPass.label}>{aiMeta.label}</span>
              </span>
            ) : (
              <span className={cn('badge inline-flex items-center gap-1 text-caption font-normal', AI_COLOURS.checkReview.badge)}>
                <AiSparkleIcon size={12} />
                {aiMeta.label}
              </span>
            )
          ) : (
            <span className="text-body-sm text-fg-muted">—</span>
          )}
        </TableCell>
        <TableCell className="px-3 py-2.5">
          <span className={cn('badge text-caption font-normal', statusCls)}>{statusLabel}</span>
        </TableCell>
        <TableCell className="px-3 py-2.5 text-right">
          {(canEdit || onViewDetails || canWithdraw || canDelete) && (
            <Menu>
              <MenuTrigger
                aria-label={`Actions for ${project.title || 'Untitled project'}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg focus-visible:outline-1 focus-visible:outline-accent"
                onClick={e => e.stopPropagation()}
              >
                <MoreVertical size={16} />
              </MenuTrigger>
              <MenuContent className="w-48">
                {canEdit && (
                  <MenuItem onClick={onEdit}>
                    {project.status === 'returnedForUpdate' ? 'Continue Editing' : 'Edit'}
                  </MenuItem>
                )}
                {onViewDetails && (
                  <MenuItem onClick={onViewDetails}>
                    View
                  </MenuItem>
                )}
                {canWithdraw && (
                  <MenuItem onClick={() => setConfirmWithdrawOpen(true)}>
                    Withdraw
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem onClick={() => setConfirmDeleteOpen(true)} className="text-danger">
                    Delete
                  </MenuItem>
                )}
              </MenuContent>
            </Menu>
          )}
        </TableCell>
      </TableRow>

      <Dialog open={confirmWithdrawOpen} onOpenChange={setConfirmWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw project?</DialogTitle>
            <DialogDescription>
              This project will be withdrawn and no longer under IO review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmWithdrawOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirmWithdrawOpen(false); onWithdraw(); }}>Withdraw</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This draft project will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirmDeleteOpen(false); onDelete(); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectCard({
  project,
  request,
  batchId,
  selected,
  onToggleSelect,
  canManage,
  onEdit,
  onViewDetails,
  onDelete,
  onWithdraw,
}: {
  project: SubmittedProject;
  request?: ProjectRequest;
  batchId?: string;
  selected: boolean;
  onToggleSelect: () => void;
  canManage: boolean;
  onEdit: () => void;
  onViewDetails?: () => void;
  onDelete: () => void;
  onWithdraw: () => void;
}) {
  const statusLabel = STATUS_LABELS[project.status] ?? STATUS_LABELS.pending;
  const statusCls = STATUS_COLOURS[project.status] ?? STATUS_COLOURS.pending;
  const aiMeta = aiCheckMeta(project);
  const showAiMeta = project.status !== 'approved' && project.status !== 'withdrawn';
  const canEdit = canManage && (project.status === 'draft' || (Boolean(batchId) && (project.status === 'returnedForUpdate' || project.status === 'withdrawn')));
  const canDelete = canManage && project.status === 'draft';
  const canWithdraw = canManage && project.status === 'pending';
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <>
      <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-body-lg font-semibold text-fg leading-tight">{project.title || 'Untitled project'}</h2>
          <span className={cn('mt-1 badge text-[14px] font-normal', statusCls)}>
            {statusLabel}
          </span>
        </div>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select ${project.title || 'Untitled project'}`}
          className="mt-1"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-0 gap-y-3 text-body-sm text-fg">
        <span className="inline-flex items-center gap-2 border-r border-border pr-3">
          <Calendar size={14} className="text-fg-muted" />
          {projectPeriod(project, request)}
        </span>
        <span className="inline-flex items-center gap-2 pl-3">
          <Clock size={14} className="text-fg-muted" />
          {projectDuration(project)}
        </span>
        <span className="inline-flex items-center gap-2 border-r border-border pr-3">
          <Users size={14} className="text-fg-muted" />
          {project.slots} placement{project.slots !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-2 pl-3">
          <User size={14} className="text-fg-muted" />
          {project.mentor || 'Mentor not set'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          project.status === 'returnedForUpdate' ? (
            <Button variant="primary" size="sm" onClick={onEdit}>Continue Editing</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          )
        )}
        {onViewDetails && (
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            View
          </Button>
        )}
        {canWithdraw && (
          <Button variant="danger" size="sm" onClick={() => setConfirmWithdrawOpen(true)}>
            Withdraw
          </Button>
        )}
        {canDelete && (
          <Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(true)} aria-label="Delete draft project">
            
            Delete
          </Button>
        )}
        </div>
        {showAiMeta && (
          aiMeta.result === 'pass' ? (
            <span className={cn('badge inline-flex items-center gap-1 text-caption font-normal', AI_COLOURS.checkPass.badge)}>
              <AiSparkleIcon size={12} />
              <span className={AI_COLOURS.checkPass.label}>{aiMeta.label}</span>
            </span>
          ) : (
            <span className={cn('badge inline-flex items-center gap-1 text-caption font-normal', AI_COLOURS.checkReview.badge)}>
              <AiSparkleIcon size={12} />
              {aiMeta.label}
            </span>
          )
        )}
      </div>
      </article>

      <Dialog open={confirmWithdrawOpen} onOpenChange={setConfirmWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw project?</DialogTitle>
            <DialogDescription>
              This project will be withdrawn and no longer under IO review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmWithdrawOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => { setConfirmWithdrawOpen(false); onWithdraw(); }}>
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This draft project will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => { setConfirmDeleteOpen(false); onDelete(); }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CheckRow({
  checked,
  disabled,
  title,
  description,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  title: string;
  description: string;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <label className={cn(
      'flex cursor-pointer items-start gap-3 rounded-lg px-4 py-3 pl-0 transition-colors',
      disabled && 'cursor-not-allowed bg-bg-subtle',
    )}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onCheckedChange(value === true)}
        className="mt-1"
      />
      <span>
        <span className="block text-body-sm font-medium text-fg">{title}<span className="text-danger ml-1">*</span></span>
        <span className="mt-0.5 block text-body-sm text-fg-muted">{description}</span>
      </span>
    </label>
  );
}
