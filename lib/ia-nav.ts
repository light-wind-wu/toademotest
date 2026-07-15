/* ─────────────────────────────────────────────────────────────────────────────
   IA revamp — nav model (Phase 1)

   Rebuilds the app navigation around the TOA-handoff-3 information architecture:
   a role-aware left RAIL of SECTIONS, each section opening a hover FLYOUT of its
   GROUPS. This is the structure/taxonomy from the handoff (`ia/data.js` →
   window.IA.INTERNAL / APPLICANT), re-mapped onto the routes that actually exist
   in this (yzlee77) repo — so Phase 1 introduces NO new screens: every leaf points
   at a page that already works for that role. New IA leaves arrive in later phases.

   Source of truth for the taxonomy: /tmp/toa-handoff-3/toa/project/ia/*.
   Gotcha (see memory): the handoff Sitemap maps to the diverged JH-NTT tree, so
   routes are re-derived here against the yzlee77 routes, not copied 1:1.
   ──────────────────────────────────────────────────────────────────────────── */
import {
  LayoutDashboard, GraduationCap, ClipboardList, BarChart3,
  ShieldCheck, BookOpen, Settings, Folder, Home, User, Send, Inbox, type LucideIcon,
} from 'lucide-react';
import { mentorIdMatches } from './utils';
import type { UserRole } from './types';

/** A flyout group (level-2). Routes to an existing page, or `soon` = placeholder. */
export interface IaGroup {
  id:     string;
  label:  string;
  route?: string;   // existing route; omitted when `soon`
  soon?:  boolean;  // not built yet (later IA phase) — shown disabled
  badge?: BadgeKey; // optional action-count badge
}

/** A rail section (level-1). `route` is its landing page; `groups` open in a flyout. */
export interface IaSection {
  id:      string;
  label:   string;
  icon:    LucideIcon;
  route:   string;
  match?:  (route: string) => boolean; // active-state test (defaults to startsWith)
  groups?: IaGroup[];
  badge?:  BadgeKey;                    // section-level action badge
}

/** Keys for the live action-count badges computed in the rail from localStorage. */
export type BadgeKey =
  | 'ioApplications' | 'ioRequests' | 'ioInterns'
  | 'mentorPending' | 'mentorInterviews' | 'mentorEval'
  | 'director' | 'applicantFeedback';

/** The three workstreams above the rail — only Internship is live in this build. */
export const WORKSTREAMS = [
  { id: 'internship',  label: 'Internship',  available: true  },
  { id: 'outreach',    label: 'Outreach',    available: false },
  { id: 'scholarship', label: 'Scholarship', available: false },
] as const;

const isApplicantRole = (r: UserRole) => r === 'new-applicant' || r === 'existing-scholar-applicant';

/* ── Per-role section trees ──────────────────────────────────────────────────
   Each role returns the IA sections it can see, populated with existing routes.
   Section ids/icons/labels follow the handoff taxonomy so the rail reads the same
   across roles; only the routes differ. */

function ioNav(role: UserRole): IaSection[] {
  const isAdmin = role === 'io-admin';
  const sections: IaSection[] = [
    { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, route: '/dashboard' },
    { id: 'programmes', label: 'Programmes',  icon: BookOpen,        route: '/programmes' },
    // Project Requests is its own rail shortcut for io-admin (was a tab under Projects).
    ...(isAdmin ? [{ id: 'requests', label: 'Project Requests', icon: Send, route: '/requests', badge: 'ioRequests' as BadgeKey } as IaSection] : []),
    { id: 'projects', label: 'Projects', icon: Folder, route: '/projects' },
    { id: 'applications', label: 'Applications', icon: ClipboardList, route: '/applications', badge: 'ioApplications' },
    { id: 'internships',  label: 'Internships',  icon: GraduationCap, route: '/interns',      badge: 'ioInterns' },
    { id: 'analytics',    label: 'Analytics',    icon: BarChart3,     route: '/analytics' },
    // Admin Settings is io-admin only (views/templates.tsx + /admin redirect others to
    // /dashboard). The /admin page is the full Admin Console (its own sub-rail of areas,
    // incl. Templates → /templates), so no rail groups / section-tabs here.
    ...(isAdmin ? [{
      id: 'settings', label: 'Admin', icon: Settings, route: '/admin',
      match: (r: string) => r.startsWith('/admin') || r.startsWith('/templates'),
    } as IaSection] : []),
  ];
  return sections;
}

function mentorNav(): IaSection[] {
  return [
    { id: 'dashboard',   label: 'Dashboard',  icon: LayoutDashboard, route: '/mentor', match: (r) => r === '/mentor' },
    { id: 'projects',    label: 'My Projects', icon: Folder,        route: '/mentor/projects', badge: 'mentorPending' },
    { id: 'applications', label: 'Candidates', icon: ClipboardList,  route: '/mentor/interviews', badge: 'mentorInterviews' },
    { id: 'internships', label: 'My Interns',  icon: GraduationCap, route: '/mentor/interns', badge: 'mentorEval' },
  ];
}

function adNav(): IaSection[] {
  // AD (P&C) is a focused role — they only respond to IO project requests. No dashboard
  // and no side navigation; every AD page renders with the nav hidden. Kept minimal.
  return [
    { id: 'requests', label: 'Project Requests', icon: Inbox, route: '/submissions',
      match: (r) => r === '/submissions' || r.startsWith('/submissions/') },
  ];
}

function directorNav(): IaSection[] {
  return [
    { id: 'approvals', label: 'Approvals', icon: ShieldCheck, route: '/director', badge: 'director' },
  ];
}

function applicantNav(hasApplied: boolean, hasInternship: boolean): IaSection[] {
  const sections: IaSection[] = [];
  if (!hasApplied) {
    sections.push({ id: 'apply', label: 'Apply', icon: BookOpen, route: '/apply',
      match: (r) => r === '/apply' || (r.startsWith('/apply/') && !r.startsWith('/apply/dashboard') && !r.startsWith('/apply/applications') && !r.startsWith('/apply/internship')) });
  } else {
    sections.push({ id: 'home',        label: 'Home',         icon: Home,          route: '/apply/dashboard' });
    sections.push({ id: 'my-apps',     label: 'Applications', icon: ClipboardList, route: '/apply/applications' });
  }
  if (hasInternship) {
    sections.push({ id: 'my-internship', label: 'Internships', icon: GraduationCap, route: '/apply/internship', badge: 'applicantFeedback' });
  }
  return sections;
}

/** Resolve the rail sections for a role + applicant flags. */
export function getNav(role: UserRole, flags: { hasApplied: boolean; hasInternship: boolean }): IaSection[] {
  if (isApplicantRole(role)) return applicantNav(flags.hasApplied, flags.hasInternship);
  switch (role) {
    case 'mentor':   return mentorNav();
    case 'ad-pnc':   return adNav();
    case 'director': return directorNav();
    case 'io':
    case 'io-admin': return ioNav(role);
    default:         return ioNav(role);
  }
}

/** Default active-state test for a section against the current route. */
export function isSectionActive(section: IaSection, activeRoute: string): boolean {
  if (section.match) return section.match(activeRoute);
  return activeRoute === section.route || activeRoute.startsWith(section.route + '/') || activeRoute === section.route;
}

/* ── Cross-IA search ─────────────────────────────────────────────────────────
   A flat, role-scoped index of every reachable destination (sections + groups),
   so the topbar search spans the whole IA, not just the current page. */
export interface SearchEntry {
  label: string;
  sub:   string;                 // breadcrumb-ish context ("Section" / parent label / record type)
  icon:  LucideIcon;
  route?: string;
  soon?:  boolean;
  kind?: 'page' | 'record';      // page = nav destination; record = a candidate/project/programme
}

export function buildSearchIndex(role: UserRole, flags: { hasApplied: boolean; hasInternship: boolean }): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const s of getNav(role, flags)) {
    out.push({ label: s.label, sub: 'Section', icon: s.icon, route: s.route, kind: 'page' });
    for (const g of s.groups ?? []) {
      if (g.label === s.label) continue; // skip the group that duplicates the section
      out.push({ label: g.label, sub: s.label, icon: s.icon, route: g.route, soon: g.soon, kind: 'page' });
    }
  }
  return out;
}

const readArr = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]; } catch { return []; }
};

/* Record-level search index (spec: search also spans records, not just pages). Reads
   localStorage, so call client-side only. Role-scoped: IO/admin see all candidates +
   projects + programmes; a mentor sees only their own interns. Records route to their
   detail pages (a candidate → Candidate 360). */
export function buildRecordIndex(role: UserRole, email: string, flags: { hasApplied: boolean; hasInternship: boolean }): SearchEntry[] {
  if (typeof window === 'undefined') return [];
  const out: SearchEntry[] = [];
  const sectionIds = new Set(getNav(role, flags).map(s => s.id));

  if (role === 'io' || role === 'io-admin') {
    for (const a of readArr<{ id: string; name?: string; programmeName?: string; course?: string }>('dsta_applications')) {
      if (a.name) out.push({ label: a.name, sub: a.programmeName || a.course || 'Candidate', icon: User, route: `/candidate360/${a.id}`, kind: 'record' });
    }
  } else if (role === 'mentor') {
    const projects = readArr<{ id: string; mentorUserId?: string }>('dsta_projects');
    const mine = new Set(projects.filter(p => mentorIdMatches(p.mentorUserId, email)).map(p => p.id));
    for (const a of readArr<{ id: string; name?: string; shortlistedFor?: string }>('dsta_applications')) {
      if (a.name && a.shortlistedFor && mine.has(a.shortlistedFor)) out.push({ label: a.name, sub: 'Your candidate', icon: User, route: `/candidate360/${a.id}`, kind: 'record' });
    }
  }

  if ((role === 'io' || role === 'io-admin') && sectionIds.has('projects')) {
    for (const p of readArr<{ id: string; title?: string }>('dsta_projects')) {
      if (p.title) out.push({ label: p.title, sub: 'Project', icon: Folder, route: `/projects/${p.id}`, kind: 'record' });
    }
  }
  if (sectionIds.has('programmes')) {
    for (const p of readArr<{ id: string; title?: string }>('dsta_programmes')) {
      if (p.title) out.push({ label: p.title, sub: 'Programme', icon: BookOpen, route: `/programmes/${p.id}`, kind: 'record' });
    }
  }
  return out;
}

/** Rank + return the best matches (max 9) for a query, across pages + records. */
export function runSearch(index: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = index
    .map(e => {
      const label = e.label.toLowerCase();
      let score = -1;
      if (label === q) score = 0;
      else if (label.startsWith(q)) score = 1;
      else if (label.includes(q)) score = 2;
      else if (e.sub.toLowerCase().includes(q)) score = 3;
      // tie-break: pages rank above records at the same score
      return { e, score: score >= 0 && e.kind === 'record' ? score + 0.5 : score };
    })
    .filter(x => x.score >= 0)
    .sort((a, b) => a.score - b.score || a.e.label.length - b.e.label.length);
  return scored.slice(0, 9).map(x => x.e);
}
