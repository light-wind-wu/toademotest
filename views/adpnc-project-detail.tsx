'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { ArrowLeft, ChevronRight, Clock, History, FileClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadRequests, loadSubmissions, saveSubmissions } from '@/lib/storage';
import { findGroup, projectMatchesRequest, requestRawCategory } from '@/lib/request-groups';
import { periodLabelToMMMYY } from '@/lib/internship-period';
import { STATUS_COLOURS } from '@/lib/data';
import RequestContextTable from '@/components/ui-legacy/request-context-table';
import type { ProjectRequest, ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';

const STATUS_LABELS: Record<SubmittedProject['status'], string> = {
  draft: 'Draft',
  pending: 'Pending Review',
  frozen: 'Frozen',
  approved: 'Approved',
  rejected: 'Rejected',
  returnedForUpdate: 'Returned for Update',
  withdrawn: 'Withdrawn',
};

function fmtValue(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function fmtDate(date: string | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
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
  if (!project.internshipDuration) return '—';
  return project.internshipDuration.toLowerCase().includes('month')
    ? project.internshipDuration
    : `${project.internshipDuration} months`;
}

function DetailItem({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div>
      <p className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">{label}</p>
      <p className="mt-1 text-body-sm text-fg">{fmtValue(value)}</p>
    </div>
  );
}

export default function AdPncProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = decodeURIComponent(String(params?.batchId ?? ''));
  const projId = decodeURIComponent(String(params?.projId ?? ''));

  const [batch, setBatch] = useState<ProjectSubmissionBatch | null>(null);
  const [project, setProject] = useState<SubmittedProject | null>(null);
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    const batches = loadSubmissions();
    const foundBatch = batches.find(item => item.id === batchId) ?? null;
    setBatch(foundBatch);
    setProject(foundBatch?.projects.find(item => item.id === projId) ?? null);
    setRequests(loadRequests());
  }, [batchId, projId]);

  const group = batch ? findGroup(requests, batch.uploadToken) : null;
  const matchedRequest = useMemo(() => {
    if (!project || !group) return undefined;
    return group.requests.find(request => projectMatchesRequest(project, request));
  }, [group, project]);

  const backHref = batch ? `/submissions/respond?token=${encodeURIComponent(batch.uploadToken)}&mode=view` : '/submissions';

  if (!batch || !project) {
    return (
      <Shell activeRoute="/submissions" hideNavigation>
        <div className="flex min-h-64 items-center justify-center text-body-md text-fg-muted">
          Project not found.
        </div>
      </Shell>
    );
  }

  const statusLabel = STATUS_LABELS[project.status] ?? STATUS_LABELS.pending;
  const statusCls = STATUS_COLOURS[project.status] ?? STATUS_COLOURS.pending;

  function handleWithdraw() {
    if (!batch || !project) return;
    const batches = loadSubmissions();
    const batchIndex = batches.findIndex(b => b.id === batch.id);
    if (batchIndex < 0) return;
    const nextBatch = { ...batches[batchIndex] };
    const projectIndex = nextBatch.projects.findIndex(p => p.id === project.id);
    if (projectIndex < 0) return;
    const nextProject: SubmittedProject = {
      ...nextBatch.projects[projectIndex],
      status: 'withdrawn',
      withdrawnAt: new Date().toISOString(),
    };
    nextBatch.projects[projectIndex] = nextProject;
    const nextBatches = [...batches];
    nextBatches[batchIndex] = nextBatch;
    saveSubmissions(nextBatches);
    setProject(nextProject);
    setBatch(nextBatch);
  }

  return (
    <Shell activeRoute="/submissions" hideNavigation>
      <nav className="mb-5 flex items-center gap-2 text-body-sm text-fg-muted">
        <button type="button" onClick={() => router.push('/submissions')} className="hover:text-accent">
          Project Requests
        </button>
        <ChevronRight size={14} className="text-fg-subtle" />
        <button type="button" onClick={() => router.push(backHref)} className="hover:text-accent">
          Request Project
        </button>
        <ChevronRight size={14} className="text-fg-subtle" />
        <span className="font-medium text-fg">Project Details</span>
      </nav>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-headline-lg text-fg">{project.title || 'Untitled project'}</h1>
            <span className={cn('badge text-caption font-normal', statusCls)}>{statusLabel}</span>
          </div>
          <p className="text-body-sm text-fg-muted">
            Submitted by {batch.submittedBy || batch.pcHead || 'AD (P&C)'}
          </p>
        </div>
      </div>

      <div className="space-y-5 min-h-[calc(100vh-280px)]">
        {group && (
          <section className="rounded-lg border border-border bg-surface p-5">
            <RequestContextTable requests={group.requests} title="Request Context" />
          </section>
        )}

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-label-lg font-semibold text-fg">View Project</h2>

          {(project.status === 'pending' || project.status === 'approved') && (
            <div className="mb-4 rounded-lg border border-info/30 bg-info-bg px-4 py-3">
              <p className="text-body-sm text-info">
                This project is pending and can no longer be edited here. To change placements after submission, withdraw the project below, then edit and resubmit it while the window is open.
              </p>
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem label="Programme centre" value={project.pc || batch.pc} />
            <DetailItem label="Intern category" value={matchedRequest ? requestRawCategory(matchedRequest) : project.educationLevel} />
          </div>

          <div className="mb-4 space-y-4">
            <DetailItem label="Project title" value={project.title} />
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">Project scope</p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm leading-relaxed text-fg">{project.description || '—'}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-fg-subtle">Tech Competency</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {project.skills.length > 0 ? (
                  project.skills.map(skill => (
                    <span key={skill} className="badge border border-border bg-bg-subtle text-fg">{skill}</span>
                  ))
                ) : (
                  <span className="text-body-sm text-fg">—</span>
                )}
              </div>
            </div>
            <DetailItem label="Discipline of Study" value={project.discipline} />
          </div>

          <div className="mb-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-fg-subtle mb-2">Primary Mentor</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DetailItem label="Name" value={project.mentor} />
              <DetailItem label="Appointment" value={project.mentorAppointment} />
              <DetailItem label="Email" value={project.mentorUserId} />
            </div>
          </div>

          <div className="mb-4">
            <p className="text-caption font-semibold uppercase tracking-wide text-fg-subtle mb-2">Secondary Mentor</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DetailItem label="Name" value={project.secondaryMentor} />
              <DetailItem label="Appointment" value={project.secondaryMentorAppointment} />
              <DetailItem label="Email" value={project.secondaryMentorEmail} />
            </div>
          </div>

          <DetailItem label="Number of placements" value={project.slots} />
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-label-lg font-semibold text-fg">Audit Log</h2>
              <div className="flex items-center gap-2 text-body-sm text-fg-muted hidden">
                <Clock size={14} />
                <span>Current status</span>
                <span className={cn('badge text-caption font-normal', statusCls)}>{statusLabel}</span>
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
            <div className="space-y-3">
              <div className="flex gap-4">
                <span className="w-28 shrink-0 text-body-sm text-fg-muted">{fmtDate(project.submittedAt || batch.uploadedAt)}</span>
                <div>
                  <p className="text-body-sm font-medium text-fg">{statusLabel}</p>
                  <p className="text-body-sm text-fg-muted">
                    Project submitted to IO for review under {project.pc || batch.pc || '—'}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 z-20 -mx-[clamp(24px,2.6vw,40px)] -mb-8 mt-5 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-gradient-to-b from-surface to-bg px-[clamp(24px,2.6vw,40px)] py-2">
        <p className="text-body-sm text-fg-muted">Read-only project details</p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push(backHref)}>
            Back
          </Button>
          <Button variant="danger" onClick={handleWithdraw}>
            Withdraw Project
          </Button>
        </div>
      </div>
    </Shell>
  );
}
