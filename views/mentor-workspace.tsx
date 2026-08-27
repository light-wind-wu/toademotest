'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { ChevronLeft, FileText, Mail, CalendarClock, BookOpen, ChevronsUpDown, Download } from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry, SharedInterviewSession } from '@/lib/types';
import { loadProjects, saveProjects, loadSharedInterviewSessions, saveSharedInterviewSessions } from '@/lib/storage';
import { loadApplications, saveApplications } from '@/lib/ut-scenarios/utils';
import { seedMentorFixtures } from '@/lib/ut-scenarios/fixtures/mentor';
import CalendarView from '@/components/mentor/calendar-view';
import InterviewSetupModal from '@/components/mentor/interview-setup-modal';
import {
  getMentorApplicantStage,
  getMentorNextAction,
  getMentorRecordsBadgeClass,
  getMentorRecordsNextAction,
  getMentorRecordsStage,
  getSchoolShort,
  MENTOR_RECORDS_STAGE_LABELS,
  formatSlot,
  getSessionForApplicant,
} from '@/lib/mentor-workspace';

const VIEW_TABS = [
  { key: 'records', label: 'Records' },
  { key: 'calendar', label: 'Calendar' },
] as const;

type ViewTab = typeof VIEW_TABS[number]['key'];

function ApplicantDocuments({ app }: { app: Application }) {
  const items: { label: string; fileName?: string; fileSize?: string; icon: React.ReactNode }[] = [
    { label: 'Transcript', fileName: app.transcriptFileName, fileSize: app.transcriptFileSize, icon: <FileText size={16} className="text-accent" /> },
    { label: 'Cover letter', fileName: app.cvFileName, fileSize: app.cvFileSize, icon: <Mail size={16} className="text-accent" /> },
  ];

  return (
    <div className="space-y-2">
      {items.map(({ label, fileName, fileSize, icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-semibold text-fg">{label}</p>
            <p className="text-[12px] text-fg-muted truncate">
              {fileName ?? `${label.replace(/\s+/g, '_')}_${app.name.replace(/\s+/g, '_')}.pdf`}
              {fileSize ? ` · ${fileSize}` : null}
            </p>
          </div>
          <Download size={16} className="text-fg-subtle shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function MentorWorkspace() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useRole();
  const projectId = params?.id as string;

  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [sessions, setSessions] = useState<SharedInterviewSession[]>([]);
  const [view, setView] = useState<ViewTab>('records');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [setupApp, setSetupApp] = useState<Application | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);

  useEffect(() => {
    seedMentorFixtures();
    setProjects(loadProjects());
    setApps(loadApplications());
    setSessions(loadSharedInterviewSessions());
  }, []);

  const project = useMemo(
    () => projects.find(p => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const myProjectIds = useMemo(
    () => new Set(projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)).map(p => p.id)),
    [projects, profile.email],
  );

  const isOwner = project ? myProjectIds.has(project.id) : false;

  const projectApps = useMemo(
    () => apps.filter(a => a.shortlistedFor === projectId),
    [apps, projectId],
  );

  const selectedApp = useMemo(
    () => projectApps.find(a => a.id === selectedId) ?? projectApps[0] ?? null,
    [projectApps, selectedId],
  );

  useEffect(() => {
    if (selectedApp && !selectedId) setSelectedId(selectedApp.id);
  }, [selectedApp, selectedId]);

  function persistApps(next: Application[]) {
    setApps(next);
    saveApplications(next);
  }

  function persistSessions(next: SharedInterviewSession[]) {
    setSessions(next);
    saveSharedInterviewSessions(next);
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => projectApps.length > 0 && selectedIds.size === projectApps.length,
    [projectApps, selectedIds],
  );

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projectApps.map(a => a.id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const projectSessions = useMemo(
    () => sessions.filter(s => s.projectId === projectId),
    [sessions, projectId],
  );

  function handleCreateSession(session: SharedInterviewSession, applicantId: string) {
    const nextApps = apps.map(a => {
      if (a.id !== applicantId) return a;
      return {
        ...a,
        interviewSetupMethod: 'shared' as const,
        sharedSessionId: session.id,
        interviewSlots: undefined,
        confirmedSlot: undefined,
        rescheduleNote: undefined,
      };
    });
    persistApps(nextApps);
    persistSessions([...sessions, session]);
  }

  function handleSetupSave(updatedApps: Application[], newSessions: SharedInterviewSession[]) {
    if (!setupApp) return;
    const nextApps = apps.map(a => {
      const updated = updatedApps.find(u => u.id === a.id);
      return updated ? updated : a;
    });
    persistApps(nextApps);
    if (newSessions.length > 0) {
      persistSessions([...sessions, ...newSessions]);
    }
    setSetupApp(null);
  }

  if (!project) {
    return (
      <Shell activeRoute="/mentor/projects">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="text-body-lg font-semibold text-fg">Project not found</p>
          <Button variant="ghost" onClick={() => router.push('/mentor/projects')}>
            <ChevronLeft size={14} /> Back to My Projects
          </Button>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell activeRoute="/mentor/projects">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="text-body-lg font-semibold text-fg">You are not assigned to this project</p>
          <Button variant="ghost" onClick={() => router.push('/mentor/projects')}>
            <ChevronLeft size={14} /> Back to My Projects
          </Button>
        </div>
      </Shell>
    );
  }

  const offerExtendedCount = projectApps.filter(a => a.status === 'Offer Extended').length;

  return (
    <Shell activeRoute="/mentor/projects">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-label-md mb-3">
        <button
          onClick={() => router.push('/mentor/projects')}
          className="text-fg-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={14} /> My Projects
        </button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold truncate">Interview workspace</span>
      </nav>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">{project.title}</h1>
        <p className="text-body-md text-fg-muted">
          Review applicant profiles, arrange interview slots, and submit outcomes for your approved project.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-fg-muted">
          <span>{project.programmeName ?? project.programme}</span>
          <span>·</span>
          <span>{project.internshipDuration} months</span>
          <span>·</span>
          <span>{project.workingLocation ?? 'Hybrid'}</span>
          <span className="mx-1 text-border">|</span>
          <span>{project.matched} of {project.slots} placements filled</span>
          <span className="mx-1 text-border">|</span>
          <span>{offerExtendedCount} offer extended</span>
          <span className="mx-1 text-border">|</span>
          <span className="text-success">Approved project</span>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={() => setScopeOpen(true)}>
          <BookOpen size={14} className="mr-1.5" /> View Project Scope
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-bg-subtle/50 flex items-center justify-between">
          <div>
            {view === 'records' ? (
              <>
                <p className="text-label-md font-semibold text-fg">All records</p>
                <p className="text-body-sm text-fg-muted">
                  Applicants sent by IO for {project.title}.
                </p>
              </>
            ) : (
              <>
                <p className="text-label-md font-semibold text-fg">Interview calendar</p>
                <p className="text-body-sm text-fg-muted">
                  Place shortlisted candidates into an available interview time for {project.title}.
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-body-sm text-fg-muted">
              {view === 'records' ? `${projectApps.length} records` : `${projectSessions.length} calendar events`}
            </p>
            <div className="flex gap-4 border-b border-border">
              {VIEW_TABS.map(tab => {
                const selected = view === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setView(tab.key)}
                    className={cn(
                      'relative pb-2 text-body-sm font-semibold transition-colors',
                      selected ? 'text-accent' : 'text-fg-muted hover:text-fg',
                    )}
                  >
                    {tab.label}
                    {selected && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {view === 'records' ? (
            <>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle/30">
                      <th className="px-3 py-2 w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          className="w-4 h-4 accent-accent"
                        />
                      </th>
                      <th className="px-4 py-2 text-[12px] font-semibold text-fg-subtle w-[30%]">
                        <span className="inline-flex items-center gap-1">
                          Applicant Name <ChevronsUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-4 py-2 text-[12px] font-semibold text-fg-subtle">
                        <span className="inline-flex items-center gap-1">
                          Status <ChevronsUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-4 py-2 text-[12px] font-semibold text-fg-subtle">
                        <span className="inline-flex items-center gap-1">
                          Next action <ChevronsUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-4 py-2 text-[12px] font-semibold text-fg-subtle text-right">
                        <span className="inline-flex items-center gap-1 justify-end">
                          Due <ChevronsUpDown size={12} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectApps.map(app => {
                      const stage = getMentorRecordsStage(app, sessions);
                      const selected = selectedId === app.id;
                      return (
                        <tr
                          key={app.id}
                          onClick={() => setSelectedId(app.id)}
                          className={cn(
                            'border-b border-border last:border-b-0 cursor-pointer transition-colors',
                            selected ? 'bg-bg-subtle' : 'hover:bg-bg-subtle/50',
                          )}
                        >
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(app.id)}
                              onChange={() => toggleOne(app.id)}
                              className="w-4 h-4 accent-accent"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-body-sm font-semibold text-fg">{app.name}</p>
                            <p className="text-[13px] text-fg-muted">
                              {getSchoolShort(app.school)} · Year {app.year}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold border',
                                getMentorRecordsBadgeClass(stage),
                              )}
                            >
                              {MENTOR_RECORDS_STAGE_LABELS[stage]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-body-sm text-fg">{getMentorRecordsNextAction(stage)}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="text-body-sm text-fg-muted">
                              {app.interviewDueDate
                                ? new Date(`${app.interviewDueDate}T00:00:00`).toLocaleDateString('en-SG', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedApp && (
                <div className="w-full lg:w-[360px] lg:border-l border-border p-5 space-y-4">
                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <p className="text-headline-sm font-bold text-fg">{selectedApp.name}</p>
                    <p className="text-body-sm text-fg-muted mt-0.5">
                      {getSchoolShort(selectedApp.school)} · Year {selectedApp.year}
                    </p>

                    {selectedApp.projectFitSummary && (
                      <div className="mt-4 rounded-xl bg-bg-subtle border border-border p-3">
                        <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Project fit</p>
                        <p className="text-body-sm text-fg">{selectedApp.projectFitSummary}</p>
                      </div>
                    )}

                    {selectedApp.interviewDueDate && (
                      <div className="mt-3 flex items-center gap-2 text-body-sm text-fg-muted">
                        <CalendarClock size={14} />
                        Due {formatSlot({ date: selectedApp.interviewDueDate, time: '00:00' }, { includeTime: false })}
                      </div>
                    )}

                    <div className="mt-5">
                      <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Documents</p>
                      <ApplicantDocuments app={selectedApp} />
                    </div>

                    <div className="mt-5">
                      <Button
                        onClick={() => setSetupApp(selectedApp)}
                        disabled={selectedApp.status === 'Interview Completed' && !!selectedApp.mentorDecision}
                      >
                        Set Up Interview
                      </Button>
                    </div>
                  </div>

                  {selectedApp.sharedSessionId && (
                    <div className="rounded-2xl border border-border bg-surface p-5">
                      <p className="text-label-md font-semibold text-fg mb-2">Interview arrangement</p>
                      {(() => {
                        const session = getSessionForApplicant(selectedApp, sessions);
                        if (!session) return <p className="text-body-sm text-fg-muted">Session not found.</p>;
                        return (
                          <div className="space-y-2 text-body-sm text-fg">
                            <p>
                              <span className="text-fg-muted">Date:</span>{' '}
                              {formatSlot({ date: session.date, time: session.time }, { includeTime: true })}
                            </p>
                            <p>
                              <span className="text-fg-muted">Location:</span>{' '}
                              {session.location ?? '—'}
                            </p>
                            <p>
                              <span className="text-fg-muted">Status:</span>{' '}
                              {session.status === 'confirmed' ? 'Confirmed' : 'Awaiting confirmation'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <CalendarView
              weekStart="2026-07-20"
              projectId={project.id}
              apps={projectApps}
              sessions={sessions}
              onCreateSession={handleCreateSession}
            />
          )}
        </div>
      </div>

      {setupApp && (
        <InterviewSetupModal
          applicant={setupApp}
          projectApplicants={projectApps}
          onClose={() => setSetupApp(null)}
          onSave={handleSetupSave}
        />
      )}

      {scopeOpen && (
        <Modal open onClose={() => setScopeOpen(false)} maxWidth="lg" ariaLabel="Project scope">
          <div className="space-y-4">
            <h2 className="text-headline-sm font-bold text-fg">Project Scope</h2>
            <p className="text-body-md text-fg font-semibold">{project.title}</p>
            <p className="text-body-sm text-fg leading-relaxed">{project.description}</p>
            {project.skills && project.skills.length > 0 && (
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {project.skills.map(s => (
                    <span key={s} className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-accent/8 text-accent">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setScopeOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
