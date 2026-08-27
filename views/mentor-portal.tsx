'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Briefcase, Clock, MapPin } from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry, SharedInterviewSession } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import { loadSharedInterviewSessions } from '@/lib/storage';
import { loadApplications } from '@/lib/ut-scenarios/utils';
import { seedMentorFixtures } from '@/lib/ut-scenarios/fixtures/mentor';
import {
  getProjectPortalSummaries,
  isMentorProjectActive,
  type MentorPortalStage,
} from '@/lib/mentor-workspace';

const TABS = [
  { key: 'active', label: 'Active projects' },
  { key: 'closed', label: 'Closed projects' },
] as const;

type TabKey = typeof TABS[number]['key'];

function stageBadgeClass(stage: MentorPortalStage): string {
  switch (stage) {
    case 'shortlisted':
    case 'rescheduling-required':
      return 'text-warning';
    case 'interview-completed':
      return 'text-info';
    default:
      return 'text-fg-muted';
  }
}

function ProjectCard({
  project,
  apps,
  sessions,
}: {
  project: ProjectEntry;
  apps: Application[];
  sessions: SharedInterviewSession[];
}) {
  const router = useRouter();
  const summaries = useMemo(
    () => getProjectPortalSummaries(project.id, apps, sessions),
    [project.id, apps, sessions],
  );
  const hasAction = summaries.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-6 py-5">
        <h2 className="text-headline-sm font-bold text-fg mb-1">{project.title}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-fg-muted">
          <span className="flex items-center gap-1">
            <Clock size={13} className="shrink-0" />
            {project.internshipDuration} months
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={13} className="shrink-0" />
            {project.workingLocation ?? 'Hybrid'}
          </span>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-body-sm text-fg-muted">Programme</p>
          <p className="text-body-sm text-fg">{project.programmeName ?? project.programme}</p>
        </div>

        <div className="mt-5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Mentor action status</p>
          {!hasAction ? (
            <p className="text-body-sm text-fg-muted">No pending actions for this project.</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:divide-x divide-border">
              {summaries.map(({ stage, label, count, nextAction }) => (
                <div key={stage} className="flex-1 py-3 sm:px-5 first:sm:pl-0 last:sm:pr-0">
                  <p className={cn('text-body-md font-bold', stageBadgeClass(stage))}>
                    {count} {label}
                  </p>
                  <p className="mt-2 text-[12px] font-semibold text-fg-subtle">Next action &rarr;</p>
                  <p className="text-body-sm text-fg">{nextAction}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button
            onClick={() => router.push(`/mentor/projects/${project.id}/workspace`)}
          >
            Manage Applicants
          </Button>
          <span className="text-body-sm text-fg-muted">
            {project.slots > 0 ? (
              <>
                {project.matched} of {project.slots} placements filled
              </>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MentorPortal() {
  const { profile } = useRole();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [sessions, setSessions] = useState<SharedInterviewSession[]>([]);

  useEffect(() => {
    seedMentorFixtures();
    setProjects(loadProjects());
    setApps(loadApplications());
    setSessions(loadSharedInterviewSessions());
  }, []);

  const myProjects = useMemo(
    () =>
      projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)),
    [projects, profile.email],
  );

  const filteredProjects = useMemo(
    () =>
      myProjects.filter(p =>
        activeTab === 'active' ? isMentorProjectActive(p) : !isMentorProjectActive(p),
      ),
    [myProjects, activeTab],
  );

  const activeCount = myProjects.filter(isMentorProjectActive).length;
  const closedCount = myProjects.length - activeCount;

  return (
    <Shell activeRoute="/mentor/projects">
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">My Projects</h1>
        <p className="text-body-md text-fg-muted">
          Select an active project to continue interview work, or review completed interview records in a closed project.
        </p>
      </div>

      <div className="mb-6 flex gap-6 border-b border-border">
        {TABS.map(tab => {
          const count = tab.key === 'active' ? activeCount : closedCount;
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative pb-3 text-body-sm font-semibold transition-colors',
                selected ? 'text-accent' : 'text-fg-muted hover:text-fg',
              )}
            >
              {tab.label} ({count})
              {selected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Briefcase size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">
            {activeTab === 'active' ? 'No active projects' : 'No closed projects'}
          </p>
          <p className="text-body-md text-fg-muted">
            {activeTab === 'active'
              ? 'Contact your IO if you believe this is an error.'
              : 'Closed projects will appear here once they are archived.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} apps={apps} sessions={sessions} />
          ))}
        </div>
      )}
    </Shell>
  );
}
