'use client';

import { Bell, BellRing, CheckCheck, CircleAlert, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppNotification } from '@/lib/notifications';
import { timeAgo } from '@/lib/notifications';
import { cn } from '@/lib/utils';

type NotificationFilter = 'all' | 'unread';

export default function NotificationCentre({
  notifications,
  filter,
  onFilterChange,
  onClose,
  onMarkAllRead,
  onSelect,
}: {
  notifications: AppNotification[];
  filter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  onClose: () => void;
  onMarkAllRead: () => void;
  onSelect: (notification: AppNotification) => void;
}) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((notification) => !notification.read)
    : notifications;

  return (
    <section
      id="applicant-notification-centre"
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 flex max-h-[calc(100dvh-5.5rem)] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-xl"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <Bell className="size-5 shrink-0 text-fg-muted" strokeWidth={1.75} aria-hidden />
        <h2 className="text-[18px] font-semibold leading-6">Notifications</h2>
        {unreadCount > 0 ? (
          <span className="rounded-full bg-info-bg px-2.5 py-1 text-[12px] font-semibold leading-4 text-info" aria-live="polite">
            {unreadCount} unread
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notifications"
          className="ml-auto rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {(['all', 'unread'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange(value)}
            aria-pressed={filter === value}
            className={cn(
              'rounded-full px-3 py-1.5 text-[14px] font-medium capitalize leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              filter === value ? 'bg-bg-subtle text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {value}
          </button>
        ))}
        {unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead} className="ml-auto h-8 gap-1.5 px-2 text-[12px]">
            <CheckCheck className="size-4" aria-hidden />
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="overflow-y-auto">
        {visibleNotifications.length > 0 ? (
          <ul className="divide-y divide-border">
            {visibleNotifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => onSelect(notification)}
                  className={cn(
                    'group relative flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    !notification.read && 'bg-info-bg/30',
                  )}
                >
                  {!notification.read ? (
                    <span className="absolute left-0 top-0 h-full w-0.5 bg-accent" aria-hidden />
                  ) : null}
                  <span className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                    notification.read
                      ? 'bg-bg-subtle text-fg-muted'
                      : notification.tier === 'action'
                        ? 'bg-warning-bg text-warning'
                        : 'bg-info-bg text-info',
                  )}>
                    {notification.read
                      ? <Info className="size-4" strokeWidth={1.75} aria-hidden />
                      : notification.tier === 'action'
                        ? <CircleAlert className="size-4" strokeWidth={1.75} aria-hidden />
                        : <BellRing className="size-4" strokeWidth={1.75} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className={cn('text-[14px] leading-5 text-fg', !notification.read && 'font-semibold')}>
                        {notification.title}
                      </span>
                      <time className="shrink-0 text-[12px] leading-5 text-fg-subtle" dateTime={notification.createdAt}>
                        {timeAgo(notification.createdAt)}
                      </time>
                    </span>
                    <span className="mt-1 block text-[13px] leading-5 text-fg-muted">
                      {notification.body}
                    </span>
                    <span className="mt-2 inline-flex text-[12px] font-semibold leading-4 text-accent group-hover:underline">
                      {notification.ctaLabel ?? 'View application'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-bg-subtle text-fg-muted">
              <Bell className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-fg">
              {filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
            </p>
            <p className="mt-1 text-[13px] leading-5 text-fg-muted">
              New application updates will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
