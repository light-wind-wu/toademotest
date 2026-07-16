# Collapsible Sidebar & Header Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active left-hand navigation rail with a new collapsible sidebar (while keeping the old `ia-rail.tsx` untouched), and update the top header to match the provided screenshots.

**Architecture:** A new `CollapsibleSidebar` component owns the expandable left nav. `Shell` lifts the collapsed state and persists it in `localStorage`, passing it to both the sidebar and the main-content layout. `Topbar` is updated with the DSTA logo, a `/` shortcut hint in search, and a blue user avatar. Existing navigation data and badge logic from `lib/ia-nav.ts` are reused via a shared hook to keep the new component clean.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v4, PRIZM 4.0 tokens, lucide-react icons, localStorage persistence.

## Global Constraints
- All AI agent communications should be in Chinese (Simplified) by default.
- Node.js >= 22.0.0; run npm commands via `source ~/.nvm/nvm.sh && nvm use 22.18.0 && npm run <command>`.
- React >= 18.0.0; keep core dependency versions unchanged.
- Use PRIZM 4.0 semantic tokens only; avoid raw Tailwind colors like `bg-slate-500` or `text-blue-600`.
- Merge classes with `cn()` from `lib/utils.ts`.
- Icons come from `lucide-react`.
- App chrome lives in `components/layout/`; keep `app/*/page.tsx` files thin wrappers.
- Do not manually edit files in `components/ui/`; extend or wrap in `components/ui-legacy/` if needed.
- No external URLs or Google Fonts; styling is air-gap safe.
- Verification: `tsc --noEmit` and `npm run build` must pass.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `components/layout/collapsible-sidebar.tsx` | New collapsible sidebar component. Handles expand/collapse toggle, icon-only vs icon+label states, mobile drawer, and role-aware nav. |
| `components/layout/use-sidebar-badges.ts` | Shared hook that computes live action-count badges from localStorage. Extracted so the new sidebar does not duplicate `ia-rail.tsx` logic. |
| `components/layout/shell.tsx` | Owns `sidebarCollapsed` state, reads/writes `localStorage` key `dsta_sidebar_collapsed`, and adjusts main-content margin. |
| `components/layout/topbar.tsx` | Updated header: DSTA logo on the left, `/` search shortcut, blue avatar, plus existing search/bell/profile menu. |
| `components/layout/ia-rail.tsx` | **Unchanged.** Existing rail remains in the repo untouched. Its current working-tree modifications are preserved, not reverted. |

---

### Task 1: Create shared badge hook

**Files:**
- Create: `components/layout/use-sidebar-badges.ts`
- Test: Type-check with `tsc --noEmit`

**Interfaces:**
- Consumes: `localStorage` keys (`dsta_applications`, `dsta_projects`, `dsta_submissions`, `dsta_my_applications`), email, role, active programme.
- Produces: `type Badges = Record<BadgeKey, number>` and `hasApplied` / `hasInternship` flags returned by `useSidebarBadges(role, email, activeRoute)`.

**Notes:** `components/layout/ia-rail.tsx` must remain untouched (per user instruction). The hook is used only by the new `CollapsibleSidebar` component; existing `ia-rail.tsx` keeps its own inline badge logic.

- [ ] **Step 1: Write the hook**

Create `components/layout/use-sidebar-badges.ts` with the exact badge-count logic currently inline in `components/layout/ia-rail.tsx` (lines 41–161), returning `badges` and the helper `readApps`.

```ts
'use client';

import { useEffect, useState } from 'react';
import { loadProjects, loadSubmissions } from '@/lib/storage';
import { mentorIdMatches } from '@/lib/utils';
import { useProgramme } from '@/lib/programme-context';
import type { BadgeKey, UserRole } from '@/lib/types';

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
```

- [ ] **Step 2: Type-check**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22.18.0 && npx tsc --noEmit
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/use-sidebar-badges.ts
git commit -m "refactor(layout): add shared sidebar badge hook for new collapsible sidebar"
```

---

### Task 2: Create the new `CollapsibleSidebar` component

**Files:**
- Create: `components/layout/collapsible-sidebar.tsx`
- Test: Visual smoke-test in browser; `npm run build` later.

**Interfaces:**
- Consumes: `activeRoute: string`, `collapsed: boolean`, `onToggle: () => void`.
- Produces: Renders the left-hand navigation. No return value.

- [ ] **Step 1: Implement the component**

Create `components/layout/collapsible-sidebar.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRole } from '@/lib/role';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { useMenuVisibility, isSectionVisible } from '@/lib/portal-config';
import { getNav, isSectionActive, type IaSection, type BadgeKey } from '@/lib/ia-nav';
import { useSidebarBadges } from './use-sidebar-badges';
import { cn } from '@/lib/utils';

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

interface CollapsibleSidebarProps {
  activeRoute: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function CollapsibleSidebar({ activeRoute, collapsed, onToggle }: CollapsibleSidebarProps) {
  const { role, profile } = useRole();
  const { safeNavigate } = useUnsavedChanges();
  const { badges, hasApplied, hasInternship } = useSidebarBadges(role, profile.email, activeRoute);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuVis = useMenuVisibility();
  const sections = getNav(role, { hasApplied, hasInternship }).filter(s => isSectionVisible(role, s.id, menuVis));

  useEffect(() => { setDrawerOpen(false); }, [activeRoute]);

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

  return (
    <>
      {/* Mobile burger button */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
        aria-expanded={drawerOpen}
        className="md:hidden fixed top-0 left-0 z-40 h-16 w-14 flex items-center justify-center text-fg-muted hover:text-accent"
      >
        <Menu size={24} />
      </button>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[82vw] bg-surface shadow-xl flex flex-col">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
              <Image src="/images/dsta-logo.svg" alt="DSTA" width={72} height={40} className="object-contain h-7 w-auto" />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="p-1.5 rounded-lg text-fg-muted hover:bg-bg-subtle"><X size={20} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {sections.map((s) => {
                const active = isSectionActive(s, activeRoute);
                const Icon = s.icon;
                const n = sectionBadge(s);
                return (
                  <button key={s.id} onClick={() => safeNavigate(s.route)}
                    className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors', active ? 'bg-nav-active-bg text-nav-active-fg' : 'text-fg hover:bg-bg-subtle')}>
                    <span className="relative">
                      <Icon size={20} />
                      {n > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />}
                    </span>
                    <span className="flex-1 text-body-md font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop collapsible sidebar */}
      <aside className={cn(
        'hidden md:flex fixed left-0 top-0 h-full flex-col border-r border-border bg-surface z-50 transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Toggle button */}
        <div className="h-16 flex items-center justify-end px-3 border-b border-border shrink-0">
          <button
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col w-full overflow-y-auto py-2">
          {sections.map((s) => {
            const active = isSectionActive(s, activeRoute);
            const Icon = s.icon;
            const n = sectionBadge(s);
            return (
              <button
                key={s.id}
                onClick={() => safeNavigate(s.route)}
                title={sectionTip(s, n)}
                className={cn(
                  'relative flex items-center mx-3 rounded-lg transition-colors duration-100 group',
                  collapsed ? 'justify-center h-11 w-11 p-2' : 'gap-3 px-3 py-2.5',
                  active ? 'bg-nav-active-bg text-nav-active-fg' : 'text-fg-muted hover:text-nav-active-fg hover:bg-nav-active-bg/50'
                )}
              >
                {active && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-nav-active-fg rounded-r" />}
                <span className="relative shrink-0">
                  <Icon size={20} className={active ? 'text-nav-active-fg' : 'text-fg-muted group-hover:text-nav-active-fg'} />
                  {n > 0 && (
                    <span className={cn(
                      'absolute rounded-full bg-accent',
                      collapsed ? 'top-0 right-0 w-2 h-2' : '-top-0.5 -right-0.5 w-2 h-2'
                    )} />
                  )}
                </span>
                {!collapsed && (
                  <span className="text-body-sm font-semibold truncate">{s.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Verify import paths and types**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22.18.0 && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/collapsible-sidebar.tsx
git commit -m "feat(layout): add collapsible sidebar component"
```

---

### Task 3: Update `Shell` to use the new sidebar and manage state

**Files:**
- Modify: `components/layout/shell.tsx`
- Test: `tsc --noEmit` and visual smoke-test.

**Interfaces:**
- Consumes: `CollapsibleSidebar` component, `localStorage` key `dsta_sidebar_collapsed`.
- Produces: `collapsed` boolean passed to `CollapsibleSidebar` and used for layout offset.

- [ ] **Step 1: Modify `Shell`**

Replace the existing import and usage in `components/layout/shell.tsx`:

```tsx
'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from './collapsible-sidebar';
import SectionTabs from './section-tabs';
import Topbar from './topbar';
import KineticBounce from './kinetic-bounce';
import { useSession, isApplicantRole, roleHome } from '@/lib/session';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';

interface ShellProps {
  children:    ReactNode;
  activeRoute: string;
  hideNavigation?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'dsta_sidebar_collapsed';

export default function Shell({ children, activeRoute, hideNavigation = false }: ShellProps) {
  const { signedIn } = useSession();
  const { role, roleReady } = useRole();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (raw) setCollapsed(raw === 'true');
    } catch {/* noop */}
  }, []);

  const handleToggle = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch {/* noop */}
      return next;
    });
  };

  const onApplyRoute = activeRoute.startsWith('/apply');
  const roleMismatch = roleReady && isApplicantRole(role) !== onApplyRoute;

  useEffect(() => {
    if (!mounted) return;
    if (!signedIn) {
      router.replace(onApplyRoute ? '/login' : '/login/staff');
    } else if (roleMismatch) {
      router.replace(roleHome(role));
    }
  }, [mounted, signedIn, roleMismatch, role, onApplyRoute, router]);

  if (!mounted || !signedIn || roleMismatch) {
    return (
      <div className="flex min-h-screen items-center justify-center text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return (
    <>
      {!hideNavigation && <CollapsibleSidebar activeRoute={activeRoute} collapsed={collapsed} onToggle={handleToggle} />}
      <div className={cn('flex min-h-screen flex-col transition-all duration-200 ease-in-out', !hideNavigation && (collapsed ? 'md:ml-16' : 'md:ml-64'))}>
        <Topbar navigationHidden={hideNavigation} />
        <main className="flex-1 pt-[76px] md:pt-[80px] pb-8">
          <KineticBounce fullBleed={hideNavigation}>
            <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)]">
              {!hideNavigation && <SectionTabs activeRoute={activeRoute} />}
              {children}
            </div>
          </KineticBounce>
        </main>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
source ~/.nvm/nvm.sh && nvm use 22.18.0 && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/shell.tsx
git commit -m "feat(layout): wire collapsible sidebar into shell with persisted state"
```

---

### Task 4: Update the `Topbar` header

**Files:**
- Modify: `components/layout/topbar.tsx`
- Test: `tsc --noEmit` and visual smoke-test.

**Interfaces:**
- Consumes: DSTA logo asset `/images/dsta-logo.svg`, `ChevronLeft`/`ChevronRight` removed, `Kbd` maybe not needed. Adds `/` keyboard shortcut handling.
- Produces: Updated header UI.

- [ ] **Step 1: Add DSTA logo and adjust layout**

In `components/layout/topbar.tsx`:
- Import `Image` from `next/image` and `Search` and `Bell` already imported; add `Kbd` if available or render a plain `span`.
- Replace the header title block with a left-side logo + title group.

```tsx
import Image from 'next/image';
```

Change the header left side (around lines 113–121):

```tsx
<header className={cn(
  'fixed top-0 left-0 w-full flex justify-between items-center h-16 pr-4 md:pr-8 bg-topbar-bg border-b border-topbar-fg/10 shadow-sm z-30',
  navigationHidden ? 'pl-6 md:pl-10' : 'pl-16 md:pl-16',
)}>
  <div className="flex items-center gap-3 min-w-0">
    <Image src="/images/dsta-logo.svg" alt="DSTA" width={72} height={40} className="object-contain h-8 w-auto shrink-0" />
    <span className="text-headline-md font-bold text-topbar-fg truncate hidden sm:inline">
      Talent Outreach &amp; Acquisition
    </span>
    <span className="text-headline-md font-bold text-topbar-fg truncate sm:hidden">TOA Portal</span>
  </div>
```

- [ ] **Step 2: Add `/` shortcut hint to search and global keyboard listener**

Inside the search `<div className="relative hidden md:flex items-center group" ref={searchRef}>`:

```tsx
<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
  <span className="text-[12px] font-semibold text-topbar-fg-muted border border-topbar-fg/20 rounded px-1.5 py-0.5">/</span>
</div>
```

Add a global keyboard effect to focus the search input when `/` is pressed outside of inputs:

```tsx
const searchInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      setSearchOpen(true);
    }
  }
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, []);
```

Attach the ref to the search input:

```tsx
<input ref={searchInputRef} ... />
```

- [ ] **Step 3: Change user avatar to blue background**

Locate the profile avatar div (around line 274) and change it to:

```tsx
<div className="w-9 h-9 rounded-full bg-topbar-accent flex items-center justify-center text-topbar-bg font-bold text-body-sm shrink-0">
  {profile.initials}
</div>
```

Also update the dropdown profile header avatar (around line 284) to use the accent color:

```tsx
<div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-fg font-bold shrink-0">
  {profile.initials}
</div>
```

- [ ] **Step 4: Type-check**

```bash
source ~/.nvm/nvm.sh && nvm use 22.18.0 && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/layout/topbar.tsx
git commit -m "feat(layout): update topbar with logo, search shortcut, and blue avatar"
```

---

### Task 5: Verify build

**Files:**
- All modified files.

- [ ] **Step 1: Run production build**

```bash
source ~/.nvm/nvm.sh && nvm use 22.18.0 && npm run build
```
Expected: build succeeds with no TypeScript or build errors.

- [ ] **Step 2: Optional visual check**

If a dev server is available, run:
```bash
source ~/.nvm/nvm.sh && nvm use 22.18.0 && npm run dev
```
Then open the staff login route, sign in, and verify:
- Sidebar defaults to expanded (256px) with icon + label.
- Toggle button collapses to 64px icon-only mode.
- Header shows DSTA logo + title on the left, search with `/` hint, bell, and blue avatar on the right.
- Mobile view shows the burger drawer.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(layout): collapsible sidebar and refreshed header"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - All roles use the new sidebar → `CollapsibleSidebar` uses `useRole` and `getNav`, so it works for every role. ✓
   - DSTA logo moved to header → Task 4. ✓
   - Default expanded → `localStorage` default is `false` (collapsed), state initialized to `false`. ✓
   - `/` shortcut hint → Task 4. ✓
   - Blue avatar → Task 4. ✓
   - Old `ia-rail.tsx` untouched → removed from shell but file itself is NOT modified. Any pre-existing working-tree changes in `ia-rail.tsx` are preserved, not reverted. ✓
2. **Placeholder scan:** No TBD/TODO; all code is concrete. ✓
3. **Type consistency:** `useSidebarBadges` returns `{ badges, hasApplied, hasInternship }` consistently. `CollapsibleSidebar` props are `activeRoute`, `collapsed`, `onToggle`. `Shell` passes them correctly. ✓
