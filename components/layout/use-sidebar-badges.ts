'use client';

import { useEffect, useState } from 'react';
import { loadProjects, loadSubmissions } from '@/lib/storage';
import { mentorIdMatches } from '@/lib/utils';
import { useProgramme } from '@/lib/programme-context';
import type { UserRole } from '@/lib/types';
import type { BadgeKey } from '@/lib/ia-nav';

const APPS_SEED_VER = '30';
let _appSeedCache: unknown[] | null = null;

async function readApps<T = unknown>(): Promise<T[]> {
  try {
    const ver = localStorage.getItem('dsta_applications_seed_v');
    const raw = localStorage.getItem('dsta_applications');
    if (ver === APPS_SEED_VER && raw) return JSON.parse(raw) as T[];
  } catch { /* fall through to seed */ }
  if (!_appSeedCache) {
    _appSeedCache = ((await import('@/data/applications.json')).default) as unknown[];
  }
  return _appSeedCache as T[];
}

export type Badges = Record<BadgeKey, number>;

const ZERO_BADGES: Badges = {
  ioApplications: 0, ioRequests: 0, ioInterns: 0,
  mentorPending: 0, mentorInterviews: 0, mentorEval: 0,
  director: 0, applicantFeedback: 0,
};

function useHasApplied() {
  const [hasApplied, setHasApplied] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dsta_my_applications');
      const hasSubs = raw ? (JSON.parse(raw) as unknown[]).length > 0 : false;
      let hasDraft = false;
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i)?.startsWith('dsta_apply_draft_')) { hasDraft = true; break; }
      }
      setHasApplied(hasSubs || hasDraft);
    } catch { setHasApplied(false); }
  }, []);
  return hasApplied;
}

export function useSidebarBadges(
  role: UserRole,
  email: string,
  activeRoute: string,
) {
  const { activeProg } = useProgramme();
  const hasApplied = useHasApplied();
  const [hasInternship, setHasInternship] = useState(false);
  const [badges, setBadges] = useState<Badges>(ZERO_BADGES);
  const isApplicant = role === 'new-applicant' || role === 'existing-scholar-applicant';

  useEffect(() => {
    if (!isApplicant) { setHasInternship(false); return; }
    void (async () => {
      try {
        const INTERNSHIP_STATUSES = new Set(['Offer Accepted', 'Active Intern', 'Internship Completed', 'Withdrawn', 'Terminated']);
        const ioApps = await readApps<{ email?: string; status?: string; internFeedback?: unknown }>();
        const mine = ioApps.filter(a => a.email === email);
        setHasInternship(mine.some(a => INTERNSHIP_STATUSES.has(a.status ?? '')));
        setBadges(b => ({ ...b, applicantFeedback: mine.filter(a => a.status === 'Internship Completed' && !a.internFeedback).length }));
      } catch { setHasInternship(false); }
    })();
  }, [activeRoute, isApplicant, email]);

  useEffect(() => {
    if (role !== 'mentor') return;
    void (async () => {
      try {
        const projects = loadProjects();
        const myProjIds = new Set(projects.filter(p => mentorIdMatches(p.mentorUserId, email)).map(p => p.id));
        const apps = await readApps<{ shortlistedFor?: string; status?: string; interviewSlots?: unknown[]; mentorDecision?: string; mentorEvaluation?: unknown }>();
        const myApps = apps.filter(a => a.shortlistedFor && myProjIds.has(a.shortlistedFor));
        setBadges(b => ({
          ...b,
          mentorPending: myApps.filter(a => (a.status === 'Shortlisted for Interview' && !a.interviewSlots?.length) || (a.status === 'Interview Completed' && !a.mentorDecision)).length,
          mentorInterviews: myApps.filter(a => a.status === 'Interview Completed' && !a.mentorDecision).length,
          mentorEval: myApps.filter(a => a.status === 'Internship Completed' && !a.mentorEvaluation).length,
        }));
      } catch {/* noop */}
    })();
  }, [activeRoute, role, email]);

  useEffect(() => {
    if (role !== 'io-admin' && role !== 'io') return;
    void (async () => {
      try {
        type AppRow = { programmeId?: string; status?: string; mentorDecision?: string; welcomeLetterSent?: boolean; cocSent?: boolean };
        const apps = await readApps<AppRow>();
        const progApps = apps.filter(a => a.programmeId === activeProg);
        const ioApplications = progApps.filter(a => a.status === 'Pending Screening' || a.status === 'Pending Review' || (a.status === 'Interview Completed' && !!a.mentorDecision)).length;
        const ioInterns = progApps.filter(a => (a.status === 'Offer Accepted' && !a.welcomeLetterSent) || (a.status === 'Internship Completed' && !a.cocSent)).length;
        let ioRequests = 0;
        if (role === 'io-admin') {
          const batches = loadSubmissions();
          ioRequests = batches.flatMap(b => b.projects).filter(p => p.status === 'pending').length;
        }
        setBadges(b => ({ ...b, ioApplications, ioInterns, ioRequests }));
      } catch {/* noop */}
    })();
  }, [activeRoute, role, activeProg]);

  useEffect(() => {
    if (role !== 'director') return;
    void (async () => {
      try {
        const apps = await readApps<{ terminationRequest?: { status?: string }; earlyCompletionRequest?: { status?: string }; extensionRequest?: { status?: string } }>();
        setBadges(b => ({ ...b, director: apps.filter(a => a.terminationRequest?.status === 'pending' || a.earlyCompletionRequest?.status === 'pending' || a.extensionRequest?.status === 'pending').length }));
      } catch {/* noop */}
    })();
  }, [activeRoute, role]);

  return { badges, hasApplied, hasInternship };
}
