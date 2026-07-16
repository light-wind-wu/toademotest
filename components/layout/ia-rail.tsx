'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   IA revamp rail (Phase 1) — role-aware RAIL + workstream switcher.

   No flyout: per the new design, each section's LANDING page carries an on-page
   tab switcher for its groups (see components/layout/section-tabs.tsx), so a rail
   flyout would duplicate it. Clicking a rail section just navigates to its landing.

   Desktop: 112px left rail. Mobile: a burger button in the header opens a left
   slide-in drawer of the same sections (groups are reached via the landing tabs).
   Live action badges are ported from the previous sidebar. Width stays 112px so
   the shell/topbar offsets are unchanged.
   ──────────────────────────────────────────────────────────────────────────── */
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown, Check, Menu, X } from 'lucide-react';
import { useRole } from '@/lib/role';
import { mentorIdMatches } from '@/lib/utils';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { useProgramme } from '@/lib/programme-context';
import { getNav, isSectionActive, WORKSTREAMS, type BadgeKey, type IaSection } from '@/lib/ia-nav';
import { useMenuVisibility, isSectionVisible } from '@/lib/portal-config';
import { loadProjects, loadSubmissions } from '@/lib/storage';

/* Lazy-loaded so the 82KB seed file is not bundled into every page's JS. */
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

type Badges = Record<BadgeKey, number>;
const ZERO_BADGES: Badges = {
  ioApplications: 0, ioRequests: 0, ioInterns: 0,
  mentorPending: 0, mentorInterviews: 0, mentorEval: 0,
  director: 0, applicantFeedback: 0,
};

const BADGE_TOOLTIP: Record<BadgeKey, (n: number) => string> = {
  ioApplications:   (n) => `${n} application${n === 1 ? '' : 's'} pending screening or review`,
  ioRequests:       (n) => `${n} submitted project${n === 1 ? '' : 's'} pending IO review`,
  ioInterns:        (n) => `${n} intern action${n === 1 ? '' : 's'} required`,
  mentorPending:    (n) => `${n} applicant${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} scheduling or evaluation`,
  mentorInterviews: (n) => `${n} interview${n === 1 ? '' : 's'} awaiting evaluation`,
  mentorEval:       (n) => `${n} evaluation${n === 1 ? '' : 's'} pending`,
  director:         (n) => `${n} request${n === 1 ? '' : 's'} pending your approval`,
  applicantFeedback:(n) => `Feedback pending for ${n} internship${n === 1 ? '' : 's'}`,
};

export default function IaRail({ activeRoute }: { activeRoute: string }) {
  const { role, profile } = useRole();
  const { safeNavigate } = useUnsavedChanges();
  const { activeProg } = useProgramme();

  const [wsOpen,        setWsOpen]        = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [hasApplied,    setHasApplied]    = useState(false);
  const [hasInternship, setHasInternship] = useState(false);
  const [badges,        setBadges]        = useState<Badges>(ZERO_BADGES);

  const wsBtnRef  = useRef<HTMLButtonElement>(null);
  const wsDropRef = useRef<HTMLDivElement>(null);

  const isApplicant = role === 'new-applicant' || role === 'existing-scholar-applicant';

  /* Close the workstream menu on outside click. */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wsBtnRef.current && !wsBtnRef.current.contains(e.target as Node) &&
          wsDropRef.current && !wsDropRef.current.contains(e.target as Node)) setWsOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  /* Close the mobile drawer whenever the route changes. */
  useEffect(() => { setDrawerOpen(false); }, [activeRoute]);

  /* Applicant flags (has applied / has internship) — ported from the old sidebar. */
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

    if (isApplicant) {
      void (async () => {
        try {
          const INTERNSHIP_STATUSES = new Set(['Offer Accepted', 'Active Intern', 'Internship Completed', 'Withdrawn', 'Terminated']);
          const ioApps = await readApps<{ email?: string; status?: string; internFeedback?: unknown }>();
          const mine = ioApps.filter(a => a.email === profile.email);
          setHasInternship(mine.some(a => INTERNSHIP_STATUSES.has(a.status ?? '')));
          setBadges(b => ({ ...b, applicantFeedback: mine.filter(a => a.status === 'Internship Completed' && !a.internFeedback).length }));
        } catch { setHasInternship(false); }
      })();
    }
  }, [activeRoute, isApplicant, profile.email]);

  /* Mentor badges. */
  useEffect(() => {
    if (role !== 'mentor') return;
    void (async () => {
      try {
        const projects = loadProjects();
        const myProjIds = new Set(projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)).map(p => p.id));
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
  }, [activeRoute, role, profile.email]);

  /* IO / IO-admin badges. */
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

  /* Director badges. */
  useEffect(() => {
    if (role !== 'director') return;
    void (async () => {
      try {
        const apps = await readApps<{ terminationRequest?: { status?: string }; earlyCompletionRequest?: { status?: string }; extensionRequest?: { status?: string } }>();
        setBadges(b => ({ ...b, director: apps.filter(a => a.terminationRequest?.status === 'pending' || a.earlyCompletionRequest?.status === 'pending' || a.extensionRequest?.status === 'pending').length }));
      } catch {/* noop */}
    })();
  }, [activeRoute, role]);

  const menuVis = useMenuVisibility(); // Admin → Menu visibility controls which sections show
  const sections = getNav(role, { hasApplied, hasInternship }).filter(s => isSectionVisible(role, s.id, menuVis));

  /* Sum of a section's own badge + its groups' badges → the rail dot. */
  const sectionBadge = (s: IaSection): number => {
    let n = s.badge ? badges[s.badge] : 0;
    for (const g of s.groups ?? []) if (g.badge) n += badges[g.badge];
    return n;
  };
  const sectionTip = (s: IaSection, n: number): string | undefined => {
    if (n <= 0) return undefined;
    if (s.badge) return BADGE_TOOLTIP[s.badge](n);
    const g = (s.groups ?? []).find(g => g.badge && badges[g.badge] > 0);
    return g?.badge ? BADGE_TOOLTIP[g.badge](badges[g.badge]) : undefined;
  };

  const WorkstreamMenu = (
    <>
      {WORKSTREAMS.map(ws => (
        <button key={ws.id} disabled={!ws.available} onClick={() => ws.available && setWsOpen(false)}
          className={['w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left', ws.available ? 'hover:bg-bg-subtle cursor-pointer' : 'cursor-not-allowed'].join(' ')}>
          <span className="flex items-center gap-2.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ws.available ? 'bg-accent' : 'bg-border-strong'}`} />
            <span className="min-w-0">
              <span className={`block text-body-sm font-semibold truncate ${ws.available ? 'text-fg' : 'text-fg-subtle'}`}>{ws.label}</span>
              {!ws.available && <span className="block text-label-sm text-fg-subtle">Coming soon</span>}
            </span>
          </span>
          {ws.id === 'internship' && <Check size={13} className="text-accent shrink-0" />}
        </button>
      ))}
    </>
  );

  return (
    <>
      {/* ── Mobile: burger button in the header (left) ────────────────────── */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
        aria-expanded={drawerOpen}
        className="md:hidden fixed top-0 left-0 z-40 h-16 w-14 flex items-center justify-center text-fg-muted hover:text-accent"
      >
        <Menu size={24} />
      </button>

      {/* ── Mobile: slide-in nav drawer ───────────────────────────────────── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[82vw] bg-surface shadow-xl flex flex-col">
            {/* Header: logo + close */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
              <Image src="/images/dsta-logo.svg" alt="DSTA" width={72} height={40} className="object-contain h-7 w-auto" />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="p-1.5 rounded-lg text-fg-muted hover:bg-bg-subtle"><X size={20} /></button>
            </div>
            {/* Workstream */}
            <div className="px-3 py-3 border-b border-border">
              <p className="text-label-sm font-bold uppercase tracking-wider text-fg-subtle mb-1.5">Workstream</p>
              <div className="flex flex-col gap-0.5">{WorkstreamMenu}</div>
            </div>
            {/* Sections */}
            <nav className="flex-1 overflow-y-auto p-2">
              {sections.map((s) => {
                const active = isSectionActive(s, activeRoute);
                const Icon = s.icon;
                return (
                  <button key={s.id} onClick={() => safeNavigate(s.route)}
                    className={['w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors', active ? 'bg-nav-active-bg text-nav-active-fg' : 'text-fg hover:bg-bg-subtle'].join(' ')}>
                    <Icon size={20} className="shrink-0" />
                    <span className="flex-1 text-body-md font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ── Desktop rail ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[112px] flex-col items-center border-r border-border bg-surface z-50">
        {/* Logo */}
        <div className="h-[64px] w-full flex items-center justify-center border-b border-border px-2 shrink-0">
          <Image src="/images/dsta-logo.svg" alt="DSTA" width={72} height={40} className="object-contain px-2" style={{ width: '100%', height: 'auto' }} priority />
        </div>

        {/* Workstream switcher */}
        <div className="w-full relative border-b border-border mb-1">
          <button ref={wsBtnRef} onClick={() => setWsOpen(o => !o)} className="w-full px-3 py-3 hover:bg-bg-subtle transition-colors text-left">
            <p className="text-label-sm font-bold uppercase tracking-wider text-fg-subtle leading-none mb-1.5">Workstream</p>
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-semibold text-fg">Internship</span>
              <ChevronDown size={12} className={`text-fg-subtle shrink-0 transition-transform duration-200 ${wsOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {wsOpen && (
            <div ref={wsDropRef} className="fixed z-[200] w-52 bg-surface rounded-lg border border-border shadow-lg overflow-hidden" style={{ left: 108, top: wsBtnRef.current ? wsBtnRef.current.getBoundingClientRect().top : 80 }}>
              <p className="px-3 pt-2.5 pb-1 text-label-sm font-bold text-fg-subtle uppercase tracking-widest">Workstream</p>
              <div className="p-1.5 pt-1">{WorkstreamMenu}</div>
            </div>
          )}
        </div>

        {/* Sections */}
        <nav className="flex-1 flex flex-col w-full items-center gap-0 overflow-y-auto">
          {sections.map((s) => {
            const active = isSectionActive(s, activeRoute);
            const Icon = s.icon;
            const n = sectionBadge(s);
            return (
              <button
                key={s.id}
                onClick={() => safeNavigate(s.route)}
                title={sectionTip(s, n)}
                className={['relative w-full flex flex-col items-center justify-center py-3 transition-colors duration-100 group', active ? 'text-nav-active-fg bg-nav-active-bg' : 'text-fg-muted hover:text-nav-active-fg hover:bg-nav-active-bg/50'].join(' ')}
              >
                {active && <span className="absolute left-0 top-0 h-full w-1 bg-nav-active-fg rounded-r" />}
                <span className="relative">
                  <Icon size={22} className={active ? 'text-nav-active-fg' : 'text-fg-muted group-hover:text-nav-active-fg'} />
                </span>
                <span className="text-label-sm font-semibold mt-1 text-center leading-tight px-0.5">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
