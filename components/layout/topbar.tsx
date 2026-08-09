'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, Settings, HelpCircle, ChevronDown, LayoutGrid, ListTodo, PanelsTopLeft } from 'lucide-react';
import { useRole, ROLE_LABELS } from '@/lib/role';
import { cn } from '@/lib/utils';

import Image from 'next/image';
import { signOut } from '@/lib/session';
import OutOfScopeDialog from '@/components/apply/out-of-scope-dialog';

import {
  loadApplyDashboardVersion,
  saveApplyDashboardVersion,
  type ApplyDashboardVersion,
} from '@/lib/apply-dashboard-version';

export default function Topbar({
  navigationHidden = false,
  hideProfile = false,
}: {
  navigationHidden?: boolean;
  /** Catalog entry: logo only, no profile / search / bell */
  hideProfile?: boolean;
}) {
  const { role, profile } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const onStartTasks = pathname === '/start-tasks';
  const onCatlog = pathname === '/catlog';
  const [open,      setOpen]      = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [dashVersion, setDashVersion] = useState<ApplyDashboardVersion>('v1');
  const ref       = useRef<HTMLDivElement>(null);
  const isApplicant = role === 'new-applicant' || role === 'existing-scholar-applicant';

  useEffect(() => {
    setDashVersion(loadApplyDashboardVersion());
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current       && !ref.current.contains(e.target as Node))       setOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (document.querySelector('[aria-modal="true"]')) return;
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
        e.preventDefault();
        setSearchDialogOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={cn(
      'fixed top-0 left-0 w-full flex justify-between items-center h-16 pr-4 md:pr-8 bg-topbar-bg border-b border-topbar-fg/10 shadow-sm z-30',
      navigationHidden ? 'pl-6 md:pl-10' : 'pl-14 md:pl-6',
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <Image src="/images/dsta-logo-white.svg" alt="DSTA" width={72} height={40} className="object-contain h-8 w-auto shrink-0" />
        <span className="text-body-md font-bold text-topbar-fg truncate hidden sm:inline">
          Talent Outreach &amp; Acquisition
        </span>
        <span className="text-body-md font-bold text-topbar-fg truncate sm:hidden">TOA Portal</span>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Applicant /start-tasks: no profile yet — offer return to catalog */}
        {hideProfile && !onCatlog && (
          <button
            type="button"
            onClick={() => {
              signOut();
              window.location.href = '/catlog';
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-topbar-fg/20 bg-topbar-fg/10 px-3 py-2 text-body-sm font-semibold text-topbar-fg transition-colors hover:bg-topbar-fg/15"
          >
            <LayoutGrid size={16} className="shrink-0" strokeWidth={1.5} />
            Go Catlog
          </button>
        )}

        {!hideProfile && (
        <>
        {/* Cross-IA search — desktop only. Disabled for usability test. */}
        <div className="relative hidden md:flex items-center group">
          <Search size={18} className="absolute left-3 text-[rgba(244,242,236,0.72)] transition-colors pointer-events-none" />
          <button
            type="button"
            onClick={() => setSearchDialogOpen(true)}
            className="w-64 pl-9 pr-10 py-2 bg-topbar-fg/10 border border-topbar-fg/10 rounded-lg text-left text-body-sm text-[rgba(244,242,236,0.72)] focus:outline-none focus:ring-2 focus:ring-topbar-fg/20 focus:border-topbar-fg/20 transition-all cursor-pointer"
          >
            Search across TOA…
          </button>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-[12px] font-semibold text-[rgba(244,242,236,0.72)] border border-topbar-fg/20 rounded px-1.5 py-0.5">/</span>
          </div>
        </div>
        <OutOfScopeDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

        {/* Notifications — disabled for usability test. */}
        <button
          type="button"
          onClick={() => setNotifDialogOpen(true)}
          aria-label="Notifications"
          className="relative p-2 text-topbar-fg-muted hover:bg-topbar-fg/10 rounded-full transition-all cursor-pointer"
        >
          <Bell size={20} />
        </button>
        <OutOfScopeDialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen} />

        {/* Profile */}
        <div className="relative border-l border-topbar-fg/10 pl-4" ref={ref}>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
            className="flex items-center gap-3 rounded-xl hover:bg-topbar-fg/10 px-2 py-1 transition-all cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <p className="text-label-md text-topbar-fg font-semibold">{profile.name}</p>
              <p className="text-caption text-topbar-fg-muted">{ROLE_LABELS[role]}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[rgba(27,101,248,1)] flex items-center justify-center text-surface font-bold text-body-sm shrink-0">
              {profile.initials}
            </div>
            <ChevronDown size={16} className="text-topbar-fg-muted" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl z-50 [&_a]:cursor-pointer [&_button]:cursor-pointer">
              {/* Profile header */}
              <div className="flex items-center gap-3 p-4 bg-bg-subtle border-b border-border">
                <div className="w-10 h-10 rounded-full bg-[rgba(27,101,248,1)] flex items-center justify-center text-surface font-bold text-body-sm shrink-0">
                  {profile.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-fg text-body-md">{profile.name}</p>
                  <p className="text-caption text-fg-muted">{ROLE_LABELS[role]}</p>
                  <p className="text-caption text-accent truncate">{profile.email}</p>
                </div>
              </div>

              {/* Role switcher UI removed — switch roles from /catlog */}
              {/* Actions */}
              <div className="p-1.5">
                {/* My Profile hidden for UT — re-enable when profile is in scope */}
                {isApplicant && (
                  <div className="px-3 py-2">
                    <p className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-fg-muted">
                      <PanelsTopLeft size={14} className="shrink-0" />
                      Dashboard layout
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          ['v1', 'A'],
                          ['v2', 'B'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            saveApplyDashboardVersion(value);
                            setDashVersion(value);
                            setOpen(false);
                            if (pathname === '/apply/dashboard' || pathname === '/apply') {
                              router.refresh();
                            } else {
                              router.push('/apply/dashboard');
                            }
                          }}
                          className={cn(
                            'cursor-pointer rounded-md border px-2 py-1.5 text-[12px] font-semibold transition-colors',
                            dashVersion === value
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-border bg-surface text-fg hover:bg-bg-subtle',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={onStartTasks}
                  onClick={() => {
                    if (onStartTasks) return;
                    setOpen(false);
                    router.push('/start-tasks');
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body-md transition-colors',
                    onStartTasks
                      ? 'cursor-not-allowed text-fg-muted opacity-50'
                      : 'cursor-pointer text-fg hover:bg-bg-subtle',
                  )}
                >
                  <ListTodo size={18} className="shrink-0 text-fg-muted" />
                  Go Tasks
                </button>
                <button onClick={() => setOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-subtle text-body-md text-fg transition-colors">
                  <HelpCircle size={18} className="text-fg-muted shrink-0" />
                  Help and Support
                </button>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-subtle text-body-md text-fg transition-colors"
                >
                  <Settings size={18} className="text-fg-muted shrink-0" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-border p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                    window.location.href = '/catlog';
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-danger-bg text-body-md text-danger transition-colors"
                >
                  <LayoutGrid size={18} className="shrink-0" />
                  Go Catlog
                </button>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </header>
  );
}
