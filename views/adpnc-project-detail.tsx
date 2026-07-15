'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Badge } from '@/components/ui-legacy/badge';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { loadRequests, loadSubmissions } from '@/lib/storage';
import { findGroup, projectMatchesRequest, requestRawCategory } from '@/lib/request-groups';
import { periodLabelToMMMYY } from '@/lib/internship-period';
import type { ProjectRequest, ProjectSubmissionBatch, SubmittedProject } from '@/lib/types';

const STATUS_META: Record<SubmittedProject['status'], { label: string; variant: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  pending: { label: 'Pending Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  withdrawn: { label: 'Withdrawn', variant: 'neutral' },
};

function fmtValue(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
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

  const status = STATUS_META[project.status] ?? STATUS_META.pending;

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
            <Badge variant={status.variant} className="text-caption font-normal">{status.label}</Badge>
          </div>
          <p className="text-body-sm text-fg-muted">
            Submitted by {batch.submittedBy || batch.pcHead || 'AD (P&C)'}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(backHref)}>
          <ArrowLeft size={15} />
          Back
        </Button>
      </div>

      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-3 text-label-lg font-semibold text-fg">Project scope</h2>
          <p className="whitespace-pre-wrap text-body-md leading-relaxed text-fg">
            {project.description || '—'}
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-label-lg font-semibold text-fg">Project details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Intern Category" value={matchedRequest ? requestRawCategory(matchedRequest) : project.educationLevel} />
            <DetailItem label="Internship Window" value={projectPeriod(project, matchedRequest)} />
            <DetailItem label="Project Duration" value={projectDuration(project)} />
            <DetailItem label="Placements" value={project.slots} />
            <DetailItem label="Programme Centre" value={project.pc} />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-4 text-label-lg font-semibold text-fg">Mentor information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Primary Mentor" value={project.mentor} />
            <DetailItem label="Appointment" value={project.mentorAppointment} />
            <DetailItem label="Email" value={project.mentorUserId} />
            <DetailItem label="Secondary Mentor" value={project.secondaryMentor} />
            <DetailItem label="Secondary Email" value={project.secondaryMentorEmail} />
          </div>
          {project.mentorBio && (
            <p className="mt-4 whitespace-pre-wrap border-t border-border pt-4 text-body-sm leading-relaxed text-fg">
              {project.mentorBio}
            </p>
          )}
        </section>

        {(project.skills.length > 0 || project.discipline || project.additionalRequirements) && (
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-4 text-label-lg font-semibold text-fg">Requirements</h2>
            <div className="space-y-4">
              {project.skills.length > 0 && (
                <div>
                  <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-fg-subtle">Tech competency</p>
                  <div className="flex flex-wrap gap-2">
                    {project.skills.map(skill => (
                      <span key={skill} className="badge border border-border bg-bg-subtle text-fg">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              <DetailItem label="Discipline of Study" value={project.discipline} />
              {project.additionalRequirements && (
                <div>
                  <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-fg-subtle">Additional Requirements</p>
                  <p className="whitespace-pre-wrap text-body-sm leading-relaxed text-fg">{project.additionalRequirements}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
