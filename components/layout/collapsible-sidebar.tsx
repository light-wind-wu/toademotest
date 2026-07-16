'use client';

import { useState, useEffect, useRef } from 'react';
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
  ready?: boolean;
  onToggle: () => void;
}

export default function CollapsibleSidebar({ activeRoute, collapsed, ready = false, onToggle }: CollapsibleSidebarProps) {
  const { role, profile } = useRole();
  const { safeNavigate } = useUnsavedChanges();
  const { badges, hasApplied, hasInternship } = useSidebarBadges(role, profile.email, activeRoute);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const prevDrawerOpen = useRef(false);
  const menuVis = useMenuVisibility();
  const sections = getNav(role, { hasApplied, hasInternship }).filter(s => isSectionVisible(role, s.id, menuVis));

  useEffect(() => { setDrawerOpen(false); }, [activeRoute]);

  useEffect(() => {
    if (drawerOpen) {
      drawerRef.current?.focus();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (prevDrawerOpen.current && !drawerOpen) {
      burgerRef.current?.focus();
    }
    prevDrawerOpen.current = drawerOpen;
  }, [drawerOpen]);

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
        ref={burgerRef}
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
          <div className="absolute inset-0 bg-fg/40" onClick={() => setDrawerOpen(false)} />
          <div
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[82vw] bg-surface shadow-xl flex flex-col outline-none"
          >
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
                    aria-current={active ? 'page' : undefined}
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
        'hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] flex-col border-r border-border bg-surface z-20 overflow-x-hidden',
        ready && 'transition-all duration-200 ease-in-out',
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
                aria-label={collapsed ? s.label : undefined}
                aria-current={active ? 'page' : undefined}
                title={sectionTip(s, n)}
                className={cn(
                  'relative flex items-center rounded-lg transition-colors duration-100 group',
                  collapsed ? 'justify-center h-10 w-10 mx-3 p-2' : 'gap-3 px-3 py-2.5 mx-3',
                  active ? 'bg-nav-active-bg text-nav-active-fg' : 'text-fg-muted hover:text-nav-active-fg hover:bg-nav-active-bg/50'
                )}
              >
                {active && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-nav-active-fg rounded-r" />}
                <span className="relative shrink-0">
                  <Icon size={20} className={active ? 'text-nav-active-fg' : 'text-fg-muted group-hover:text-nav-active-fg'} />
                  {n > 0 && collapsed && (
                    <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-accent" />
                  )}
                </span>
                {!collapsed && (
                  <span className="flex-1 text-body-sm font-semibold truncate text-left">{s.label}</span>
                )}
                {n > 0 && !collapsed && (
                  <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
