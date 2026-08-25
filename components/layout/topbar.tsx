'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, Settings, HelpCircle, ChevronDown, LayoutGrid, ListTodo, PanelsTopLeft, Check, RotateCcw, MonitorUp } from 'lucide-react';
import { useRole, ROLE_LABELS } from '@/lib/role';
import { cn } from '@/lib/utils';

import Image from 'next/image';
import { signOut } from '@/lib/session';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';

import {
  saveApplyDashboardVersion,
} from '@/lib/apply-dashboard-version';
import {
  APPLICANT_HOME_SCENARIOS,
  loadApplicantHomeScenario,
  saveApplicantHomeScenario,
} from '@/lib/applicant-home-scenario';
import type { ApplicantHomeScenario } from '@/lib/types';
import { resetApplicantData } from '@/lib/applicant-data-reset';
import NotificationCentre from '@/components/layout/notification-centre';
import {
  APPLICANT_UNDER_REVIEW_NOTIFICATION_ID,
  ensureApplicantUnderReviewNotification,
  getNotificationsForRole,
  markAllRead,
  markRead,
  NOTIF_CHANGED_EVENT,
  type AppNotification,
} from '@/lib/notifications';
import { transitionApplicantApplicationToUnderReview } from '@/lib/applicant-applications';
import {
  deliverMentorInterviewInvitation,
  getOrStartApplicantReviewTimer,
  MENTOR_INTERVIEW_DELAY_MS,
  restartApplicantReviewTimer,
} from '@/lib/applicant-mentor-interview';
import {
  APPLICANT_OFFER_DELAY_MS,
  deliverApplicantOffer,
  getOrStartApplicantOfferTimer,
  restartApplicantOfferTimer,
} from '@/lib/applicant-offer';

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [homeScenario, setHomeScenario] = useState<ApplicantHomeScenario>('interview-action');
  const ref       = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const isApplicant = role === 'new-applicant' || role === 'existing-scholar-applicant';

  useEffect(() => {
    setHomeScenario(loadApplicantHomeScenario());
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current       && !ref.current.contains(e.target as Node))       setOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getNotificationsForRole(role, profile.email, profile.email));
    }

    if (isApplicant && loadApplicantHomeScenario() === 'submitted') {
      ensureApplicantUnderReviewNotification(profile.email);
    }
    refreshNotifications();
    window.addEventListener(NOTIF_CHANGED_EVENT, refreshNotifications);
    return () => window.removeEventListener(NOTIF_CHANGED_EVENT, refreshNotifications);
  }, [isApplicant, profile.email, role]);

  useEffect(() => {
    if (!isApplicant || homeScenario !== 'under-review') return;

    const startedAt = getOrStartApplicantReviewTimer();
    const remaining = Math.max(0, startedAt + MENTOR_INTERVIEW_DELAY_MS - Date.now());
    const timer = window.setTimeout(() => {
      deliverMentorInterviewInvitation(profile.email);
      setHomeScenario('interview-action');
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [homeScenario, isApplicant, profile.email]);

  useEffect(() => {
    if (!isApplicant || homeScenario !== 'interview-completed') return;

    const startedAt = getOrStartApplicantOfferTimer();
    const remaining = Math.max(0, startedAt + APPLICANT_OFFER_DELAY_MS - Date.now());
    const timer = window.setTimeout(() => {
      deliverApplicantOffer(profile.email);
      setHomeScenario('offer-action');
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [homeScenario, isApplicant, profile.email]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  function openNotification(notification: AppNotification) {
    markRead(notification.id);
    if (notification.id === APPLICANT_UNDER_REVIEW_NOTIFICATION_ID) {
      transitionApplicantApplicationToUnderReview('app-ui-2027');
      restartApplicantReviewTimer();
      saveApplyDashboardVersion('v1');
      saveApplicantHomeScenario('under-review');
      setHomeScenario('under-review');
    }
    setNotificationsOpen(false);
    router.push(notification.href);
  }

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
        <OutOfScopeTooltip>
          <div className="relative hidden md:flex items-center group">
            <Search size={18} className="absolute left-3 text-[rgba(244,242,236,0.72)] transition-colors pointer-events-none" />
            <button
              type="button"
              className="w-64 pl-9 pr-10 py-2 bg-topbar-fg/10 border border-topbar-fg/10 rounded-lg text-left text-body-sm text-[rgba(244,242,236,0.72)] focus:outline-none focus:ring-2 focus:ring-topbar-fg/20 focus:border-topbar-fg/20 transition-all cursor-pointer"
            >
              Search candidates…
            </button>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-[12px] font-semibold text-[rgba(244,242,236,0.72)] border border-topbar-fg/20 rounded px-1.5 py-0.5">/</span>
            </div>
          </div>
        </OutOfScopeTooltip>

        {/* App-shell notification centre */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-controls="applicant-notification-centre"
            onClick={(event) => {
              event.stopPropagation();
              setNotificationsOpen((current) => !current);
              setOpen(false);
            }}
            className={cn(
              'relative cursor-pointer rounded-lg p-2 text-topbar-fg-muted transition-colors hover:bg-topbar-fg/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-topbar-fg/40',
              notificationsOpen && 'bg-topbar-fg/10 text-topbar-fg',
            )}
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-surface"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <NotificationCentre
              notifications={notifications}
              filter={notificationFilter}
              onFilterChange={setNotificationFilter}
              onClose={() => setNotificationsOpen(false)}
              onMarkAllRead={() => markAllRead(role)}
              onSelect={openNotification}
            />
          ) : null}
        </div>

        {/* Profile */}
        <div className="relative border-l border-topbar-fg/10 pl-4" ref={ref}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((current) => !current);
              setNotificationsOpen(false);
            }}
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
                      Applicant Home scenario
                    </p>
                    <div
                      role="listbox"
                      aria-label="Applicant Home scenario"
                      className="max-h-52 overflow-y-auto rounded-lg border border-border bg-surface p-1"
                    >
                      {APPLICANT_HOME_SCENARIOS.map((scenario) => {
                        const selected = homeScenario === scenario.value;
                        return (
                          <button
                            key={scenario.value}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              saveApplyDashboardVersion('v1');
                              if (scenario.value === 'under-review') restartApplicantReviewTimer();
                              if (scenario.value === 'interview-completed') restartApplicantOfferTimer();
                              saveApplicantHomeScenario(scenario.value);
                              setHomeScenario(scenario.value);
                              setOpen(false);
                              if (pathname !== '/apply/dashboard' && pathname !== '/apply' && pathname !== '/apply/internship') {
                                router.push('/apply/dashboard');
                              }
                            }}
                            className={cn(
                              'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors',
                              selected
                                ? 'bg-accent/10 font-semibold text-accent'
                                : 'text-fg hover:bg-bg-subtle',
                            )}
                          >
                            <span>{scenario.label}</span>
                            {selected ? <Check size={14} className="shrink-0" aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-fg-subtle">
                      Switch between the APP-01 required state variants.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmed = window.confirm(
                          'Reset applicant data? This will clear application progress and scenario changes. Your demo profile and sign-in will be kept.',
                        );
                        if (!confirmed) return;
                        resetApplicantData();
                        saveApplyDashboardVersion('v1');
                        saveApplicantHomeScenario('no-application');
                        setHomeScenario('no-application');
                        setOpen(false);
                        router.push('/apply/dashboard');
                      }}
                      className="mt-2 flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-2 text-left text-xs font-medium text-fg transition-colors hover:bg-bg-subtle"
                    >
                      <RotateCcw size={14} className="shrink-0 text-fg-muted" aria-hidden />
                      Reset applicant data
                    </button>
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
                {isApplicant ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push('/desktop');
                    }}
                    className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body-md text-fg transition-colors hover:bg-bg-subtle"
                  >
                    <MonitorUp size={18} className="shrink-0 text-fg-muted" />
                    Return to Desktop
                  </button>
                ) : null}
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
