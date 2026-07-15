'use client';

import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/shell';
import {
  Briefcase, MapPin, Clock, Users, Tag, BookOpen, Layers,
} from 'lucide-react';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { ProjectEntry, Application } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import allAppsSeed from '@/data/applications.json';

/* ── Storage ───────────────────────────────────────────────────────────────── */
const APP_KEY       = 'dsta_applications';
const APP_VER_KEY   = 'dsta_applications_seed_v';
const APP_SEED_VER  = '31';

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    const seeded = allAppsSeed as Application[];
    localStorage.setItem(APP_KEY, JSON.stringify(seeded));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return seeded;
  } catch { return allAppsSeed as Application[]; }
}

/* ── Slot bar ──────────────────────────────────────────────────────────────── */
function SlotBar({ filled, reserved = 0, total }: { filled: number; reserved?: number; total: number }) {
  const filledPct   = total > 0 ? Math.min(filled / total, 1) * 100 : 0;
  const reservedPct = total > 0 ? Math.min(reserved / total, 1 - filled / total) * 100 : 0;
  const allFull     = filled + reserved >= total;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden flex">
        <div
          className={cn('h-full transition-all', allFull ? 'bg-success' : 'bg-accent')}
          style={{ width: `${filledPct}%` }}
        />
        {reserved > 0 && <div className="h-full bg-warning/50 transition-all" style={{ width: `${reservedPct}%` }} />}
      </div>
      <span className="text-body-sm text-fg font-semibold tabular-nums">{filled}/{total}</span>
    </div>
  );
}


/* ── Pipeline chip ─────────────────────────────────────────────────────────── */
function PipelineChip({ label, count, cls }: { label: string; count: number; cls: string }) {
  return count > 0 ? (
    <span className={cn('text-[13px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {count} {label}
    </span>
  ) : null;
}

/* ── Project card ──────────────────────────────────────────────────────────── */
function ProjectCard({ project, apps }: { project: ProjectEntry; apps: Application[] }) {
  const projApps = apps.filter(a => a.shortlistedFor === project.id);

  const toSchedule  = projApps.filter(a => a.status === 'Shortlisted for Interview' && !a.interviewSlots?.length).length;
  const awaitingConf = projApps.filter(a => a.status === 'Shortlisted for Interview' && !!a.interviewSlots?.length).length;
  const scheduled   = projApps.filter(a => a.status === 'Interview Scheduled').length;
  const completed   = projApps.filter(a => a.status === 'Interview Completed').length;
  const accepted    = projApps.filter(a => a.mentorDecision === 'Accepted').length;
  const reserved    = projApps.filter(a => a.status === 'Offer Extended').length;
  const offered     = projApps.filter(a => ['Offer Extended', 'Offer Accepted'].includes(a.status)).length;

  const hasPipeline = toSchedule + awaitingConf + scheduled + completed + accepted + offered > 0;

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-bg-subtle">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase size={15} className="text-accent shrink-0" />
              <h2 className="text-headline-sm text-fg font-bold truncate">{project.title}</h2>
            </div>
            <p className="text-body-sm text-fg-muted">{project.id}</p>
          </div>
          {project.archived && (
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-full bg-danger-bg text-danger">Archived</span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Key details grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Programme</p>
            <p className="text-body-sm text-fg">{project.programme}</p>
          </div>
          {project.pc && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Programme Centre</p>
              <p className="text-body-sm text-fg">{project.pc}</p>
            </div>
          )}
          {project.techDomain && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Tech Domain</p>
              <p className="text-body-sm text-fg">{project.techDomain}</p>
            </div>
          )}
          {project.educationLevel && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Category</p>
              <p className="text-body-sm text-fg">{project.educationLevel}</p>
            </div>
          )}
          {project.internshipDuration && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-fg-muted shrink-0" />
              <p className="text-body-sm text-fg">{project.internshipDuration}</p>
            </div>
          )}
          {project.workingLocation && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-fg-muted shrink-0" />
              <p className="text-body-sm text-fg">{project.workingLocation}</p>
            </div>
          )}
        </div>

        {/* Slots */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-fg-muted" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Slots</p>
            </div>
            <span className="text-body-sm text-fg-muted">
              {project.matched} filled{reserved > 0 ? ` · ${reserved} reserved` : ''} of {project.slots}
            </span>
          </div>
          <SlotBar filled={project.matched} reserved={reserved} total={project.slots} />
        </div>

        {/* Interview pipeline */}
        {hasPipeline && (
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-2">Candidate Pipeline</p>
            <div className="flex flex-wrap gap-1.5">
              <PipelineChip label="to schedule"      count={toSchedule}   cls="bg-warning-bg text-warning" />
              <PipelineChip label="awaiting confirm" count={awaitingConf} cls="bg-info-bg text-info" />
              <PipelineChip label="interview set"    count={scheduled}    cls="bg-accent/10 text-accent" />
              <PipelineChip label="evaluated"        count={completed}    cls="bg-success-bg text-success" />
              <PipelineChip label="offer extended"   count={offered}      cls="bg-success-bg text-success" />
            </div>
          </div>
        )}

        {/* Description */}
        {project.description && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={13} className="text-fg-muted" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Project Scope</p>
            </div>
            <p className="text-body-sm text-fg leading-relaxed">{project.description}</p>
          </div>
        )}

        {/* Discipline */}
        {project.discipline && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Layers size={13} className="text-fg-muted" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Disciplines</p>
            </div>
            <p className="text-body-sm text-fg">{project.discipline}</p>
          </div>
        )}

        {/* Skills */}
        {project.skills && project.skills.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Tag size={13} className="text-fg-muted" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Skills</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {project.skills.map(s => (
                <span key={s} className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-accent/8 text-accent">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function MentorProject() {
  const { profile } = useRole();
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [apps, setApps]         = useState<Application[]>([]);

  useEffect(() => {
    setProjects(loadProjects());
    setApps(loadApps());
  }, []);

  const mentorPrefix = profile.email.split('@')[0];
  const myProjects = useMemo(
    () => projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)),
    [projects, mentorPrefix, profile.email]
  );

  return (
    <Shell activeRoute="/mentor/project">
      <div className="mb-5">
        <h1 className="text-headline-lg text-fg mb-1">My Project{myProjects.length !== 1 ? 's' : ''}</h1>
      </div>

      {myProjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <Briefcase size={36} className="text-fg-subtle mx-auto mb-3" />
          <p className="text-body-lg font-semibold text-fg mb-1">No projects assigned</p>
          <p className="text-body-md text-fg-muted">Contact your IO if you believe this is an error.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {myProjects.map(p => (
            <ProjectCard key={p.id} project={p} apps={apps} />
          ))}
        </div>
      )}
    </Shell>
  );
}
