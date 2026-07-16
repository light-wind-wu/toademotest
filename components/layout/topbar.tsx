'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Settings, HelpCircle, LogOut, ChevronDown, ShieldCheck, UserCircle2, Briefcase, ClipboardList, GraduationCap, Award, User, CheckCheck, Gavel } from 'lucide-react';
import { useRole, ROLE_LABELS, ROLE_PROFILES } from '@/lib/role';
import type { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { buildSearchIndex, buildRecordIndex, runSearch, type SearchEntry } from '@/lib/ia-nav';
import { useSystemConfig } from '@/lib/portal-config';
import Image from 'next/image';
import { signOut, isApplicantRole } from '@/lib/session';
import {
  getNotificationsForRole, markRead, markAllRead,
  timeAgo, NOTIF_CHANGED_EVENT, type AppNotification,
} from '@/lib/notifications';

const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  'io-admin':                   '/dashboard',
  'io':                         '/dashboard',
  'mentor':                     '/mentor',
  'ad-pnc':                     '/submissions',
  'director':                   '/director',
  'new-applicant':              '/apply',
  'existing-scholar-applicant': '/apply',
};

const ROLE_SWITCHER: { role: UserRole; icon: typeof ShieldCheck }[] = [
  { role: 'io-admin',                   icon: ShieldCheck   },
  { role: 'io',                         icon: UserCircle2   },
  { role: 'mentor',                     icon: Briefcase     },
  { role: 'ad-pnc',                     icon: ClipboardList },
  { role: 'director',                   icon: Gavel         },
  { role: 'new-applicant',              icon: GraduationCap },
  { role: 'existing-scholar-applicant', icon: Award         },
];

export default function Topbar({ navigationHidden = false, collapsed = false, ready = false }: { navigationHidden?: boolean; collapsed?: boolean; ready?: boolean }) {
  const { role, setRole, profile } = useRole();
  const { safeNavigate } = useUnsavedChanges();
  const { roleSwitcher } = useSystemConfig(); // Admin → System config feature switch
  const router = useRouter();
  const [open,      setOpen]      = useState(false);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [notifs,    setNotifs]    = useState<AppNotification[]>([]);
  const [searchQ,    setSearchQ]    = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchHi,   setSearchHi]   = useState(0);
  const [flags,      setFlags]      = useState({ hasApplied: false, hasInternship: false });
  const ref       = useRef<HTMLDivElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const mentorId = profile.email;

  /* Applicant flags so the search index spans the right applicant sections. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('dsta_my_applications');
      const hasSubs = raw ? (JSON.parse(raw) as unknown[]).length > 0 : false;
      let hasDraft = false;
      for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith('dsta_apply_draft_')) { hasDraft = true; break; }
      let hasInternship = false;
      if (role === 'new-applicant' || role === 'existing-scholar-applicant') {
        const S = new Set(['Offer Accepted', 'Active Intern', 'Internship Completed', 'Withdrawn', 'Terminated']);
        const ioApps: { email?: string; status?: string }[] = JSON.parse(localStorage.getItem('dsta_applications') ?? '[]');
        hasInternship = ioApps.some(a => a.email === profile.email && S.has(a.status ?? ''));
      }
      setFlags({ hasApplied: hasSubs || hasDraft, hasInternship });
    } catch { setFlags({ hasApplied: false, hasInternship: false }); }
  }, [role, profile.email]);

  // Record index (candidates/projects/programmes) reads localStorage → compute in an effect.
  const [records, setRecords] = useState<SearchEntry[]>([]);
  useEffect(() => {
    setRecords(buildRecordIndex(role, profile.email, flags));
  }, [role, profile.email, flags.hasApplied, flags.hasInternship]);

  const searchIndex = buildSearchIndex(role, flags);
  const searchResults = runSearch([...searchIndex, ...records], searchQ);

  function pickSearch(i: number) {
    const r = searchResults[i];
    if (!r || !r.route || r.soon) return;
    setSearchOpen(false); setSearchQ('');
    safeNavigate(r.route);
  }

  function refreshNotifs() {
    setNotifs(getNotificationsForRole(role, profile.email, mentorId));
  }

  useEffect(() => {
    refreshNotifs();
    window.addEventListener(NOTIF_CHANGED_EVENT, refreshNotifs);
    return () => window.removeEventListener(NOTIF_CHANGED_EVENT, refreshNotifs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, profile.email]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current       && !ref.current.contains(e.target as Node))       setOpen(false);
      if (bellRef.current   && !bellRef.current.contains(e.target as Node))   setBellOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
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
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const unread = notifs.filter(n => !n.read).length;

  return (
    <header className={cn(
      'fixed top-0 left-0 w-full flex justify-between items-center h-16 pr-4 md:pr-8 bg-topbar-bg border-b border-topbar-fg/10 shadow-sm z-30',
      navigationHidden ? 'pl-6 md:pl-10' : (collapsed ? 'pl-14 md:pl-16' : 'pl-14 md:pl-64'),
      ready && 'transition-all duration-200 ease-in-out',
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <Image src="/images/dsta-logo.svg" alt="DSTA" width={72} height={40} className="object-contain h-8 w-auto shrink-0" />
        <span className="text-headline-md font-bold text-topbar-fg truncate hidden sm:inline">
          Talent Outreach &amp; Acquisition
        </span>
        <span className="text-headline-md font-bold text-topbar-fg truncate sm:hidden">TOA Portal</span>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Cross-IA search — desktop only. Spans every section the role can reach. */}
        <div className="relative hidden md:flex items-center group" ref={searchRef}>
          <Search size={18} className="absolute left-3 text-topbar-fg-muted group-focus-within:text-topbar-fg transition-colors pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQ}
            placeholder="Search across TOA…"
            role="combobox"
            aria-expanded={searchOpen && searchResults.length > 0}
            aria-controls="toa-search-results"
            onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); setSearchHi(0); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSearchHi(h => Math.min(h + 1, searchResults.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchHi(h => Math.max(h - 1, 0)); }
              else if (e.key === 'Enter') { e.preventDefault(); pickSearch(searchHi); }
              else if (e.key === 'Escape') { setSearchOpen(false); }
            }}
            className="w-64 pl-9 pr-10 py-2 bg-topbar-fg/10 border border-topbar-fg/10 rounded-lg text-body-md text-topbar-fg placeholder:text-topbar-fg-muted focus:outline-none focus:ring-2 focus:ring-topbar-fg/20 focus:border-topbar-fg/20 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-[12px] font-semibold text-topbar-fg-muted border border-topbar-fg/20 rounded px-1.5 py-0.5">/</span>
          </div>
          {searchOpen && searchQ.trim() && (
            <div id="toa-search-results" role="listbox" className="absolute right-0 top-full mt-2 w-[26rem] bg-surface rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-[12px] font-semibold text-fg-subtle">Searching pages and records across TOA</p>
              {searchResults.length === 0 ? (
                <p className="px-4 py-4 text-body-sm text-fg-muted">No matches for &ldquo;{searchQ.trim()}&rdquo;.</p>
              ) : (
                <div className="p-1.5 pt-0.5">
                  {searchResults.map((r, i) => {
                    const RIcon = r.icon;
                    return (
                      <button
                        key={`${r.label}-${i}`}
                        role="option"
                        aria-selected={i === searchHi}
                        onMouseEnter={() => setSearchHi(i)}
                        onClick={() => pickSearch(i)}
                        disabled={r.soon || !r.route}
                        className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                          r.soon ? 'cursor-not-allowed opacity-60' : i === searchHi ? 'bg-accent/10' : 'hover:bg-bg-subtle')}
                      >
                        <span className={cn('grid place-items-center w-8 h-8 rounded-lg shrink-0', i === searchHi ? 'bg-accent/15 text-accent' : 'bg-bg-subtle text-fg-muted')}>
                          <RIcon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-body-sm font-semibold text-fg truncate">{r.label}</span>
                          <span className="block text-[12px] text-fg-muted truncate">{r.sub}{r.soon ? ' · coming soon' : ''}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={e => { e.stopPropagation(); setBellOpen(o => !o); }}
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={bellOpen}
            className="relative p-2 text-topbar-fg-muted hover:bg-topbar-fg/10 rounded-full transition-all"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-0.5 bg-topbar-accent rounded-full flex items-center justify-center text-[12px] font-black text-topbar-bg leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-surface rounded-2xl shadow-xl border border-border z-50 overflow-hidden flex flex-col max-h-[560px]">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-fg-subtle" />
                  <span className="text-body-sm font-bold text-fg">Notifications</span>
                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 bg-danger/10 text-danger text-[12px] font-bold rounded-full">{unread} new</span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={() => { markAllRead(role); refreshNotifs(); }}
                    className="flex items-center gap-1 text-[13px] text-accent hover:underline font-semibold"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <Bell size={28} className="text-fg-subtle mb-3 opacity-40" />
                    <p className="text-body-sm font-semibold text-fg-muted">No notifications</p>
                    <p className="text-[12px] text-fg-subtle mt-1">You're all caught up</p>
                  </div>
                ) : (
                  notifs.map((n, i) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        refreshNotifs();
                        setBellOpen(false);
                        router.push(n.href);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-bg-subtle transition-colors',
                        i < notifs.length - 1 && 'border-b border-border',
                        !n.read && 'bg-bg-subtle/60',
                      )}
                    >
                      <span className={cn(
                        'mt-1.5 w-2 h-2 rounded-full shrink-0',
                        n.tier === 'action' ? 'bg-warning' : 'bg-border-strong',
                        n.read && 'opacity-40',
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'text-body-sm leading-snug',
                          !n.read ? 'font-semibold text-fg' : 'font-normal text-fg-muted',
                        )}>
                          {n.title}
                        </p>
                        <p className="text-[12px] text-fg-muted mt-0.5 leading-snug">{n.body}</p>
                        <p className="text-[13px] text-fg-subtle mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
            <div className="w-9 h-9 rounded-full bg-topbar-accent flex items-center justify-center text-topbar-bg font-bold text-body-sm shrink-0">
              {profile.initials}
            </div>
            <ChevronDown size={16} className="text-topbar-fg-muted" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
              {/* Profile header */}
              <div className="flex items-center gap-3 p-4 bg-bg-subtle border-b border-border">
                <div className="w-10 h-10 rounded-full bg-topbar-accent flex items-center justify-center text-topbar-bg font-bold shrink-0">
                  {profile.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-fg text-body-md">{profile.name}</p>
                  <p className="text-caption text-fg-muted">{ROLE_LABELS[role]}</p>
                  <p className="text-caption text-accent truncate">{profile.email}</p>
                </div>
              </div>

              {/* Role switcher — demo only; gated by the System-config feature switch */}
              {roleSwitcher && (
              <div className="p-2 border-b border-border">
                <p className="px-2 py-1 text-[12px] font-bold text-fg-subtle uppercase tracking-widest">Demo — Switch Role</p>
                {ROLE_SWITCHER.map(({ role: r, icon: Icon }) => (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setOpen(false); window.location.href = ROLE_DEFAULT_ROUTE[r]; }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                      role === r ? 'bg-accent/10 text-accent' : 'hover:bg-bg-subtle text-fg'
                    )}
                  >
                    <Icon size={16} className={role === r ? 'text-accent' : 'text-fg-muted'} />
                    <div className="min-w-0">
                      <p className="text-body-sm font-semibold">{ROLE_LABELS[r]}</p>
                      <p className="text-[13px] text-fg-muted truncate">{ROLE_PROFILES[r].name}</p>
                    </div>
                    {role === r && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                  </button>
                ))}
              </div>
              )}

              {/* Actions */}
              <div className="p-1.5">
                {(role === 'new-applicant' || role === 'existing-scholar-applicant') && (
                  <Link
                    href="/apply/profile"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-subtle text-body-md text-fg transition-colors"
                  >
                    <User size={18} className="text-fg-muted shrink-0" />
                    My Profile
                  </Link>
                )}
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
                  onClick={() => { const dest = isApplicantRole(role) ? '/login' : '/login/staff'; signOut(); setOpen(false); window.location.href = dest; }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-danger-bg text-body-md text-danger transition-colors">
                  <LogOut size={18} className="shrink-0" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
