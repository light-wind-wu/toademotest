'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   Section tabs — the on-page group switcher for a rail section's landing screen.

   The rail has no flyout; instead, when the current route belongs to a section that
   has more than one group (e.g. Projects → Projects / Project Requests, or Admin →
   Templates / System Admin), this renders a tab bar at the top of the content so the
   sibling groups stay reachable on every viewport. Renders nothing for single-group
   sections. Rendered once in the shell, above the page content.
   ──────────────────────────────────────────────────────────────────────────── */
import { useRole } from '@/lib/role';
import { useUnsavedChanges } from '@/lib/unsaved-changes';
import { getNav, type IaGroup } from '@/lib/ia-nav';
import { cn } from '@/lib/utils';

const routeMatches = (route: string | undefined, current: string) =>
  !!route && (current === route || current.startsWith(route + '/'));

export default function SectionTabs({ activeRoute }: { activeRoute: string }) {
  const { role } = useRole();
  const { safeNavigate } = useUnsavedChanges();

  // Multi-group sections only exist for internal roles, so applicant flags are irrelevant here.
  const sections = getNav(role, { hasApplied: true, hasInternship: true });

  // Find the section that owns the current route (by its own route or any group route).
  const section = sections.find(s =>
    routeMatches(s.route, activeRoute) || (s.groups ?? []).some(g => routeMatches(g.route, activeRoute)),
  );
  const groups: IaGroup[] = (section?.groups ?? []).filter(g => g.route || g.soon);
  if (!section || groups.length < 2) return null;

  const activeId = groups.find(g => routeMatches(g.route, activeRoute))?.id;

  return (
    <nav aria-label={`${section.label} sections`} className="mb-5 flex items-center gap-1 border-b border-border overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
      {groups.map((g) => {
        const active = g.id === activeId;
        return (
          <button
            key={g.id}
            disabled={g.soon}
            onClick={() => { if (g.route && !active) safeNavigate(g.route); }}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative whitespace-nowrap px-3.5 py-2.5 text-body-sm font-semibold transition-colors',
              g.soon ? 'cursor-not-allowed text-fg-subtle' : active ? 'text-accent' : 'text-fg-muted hover:text-fg',
            )}
          >
            {g.label}{g.soon && <span className="ml-1.5 text-[11px] font-semibold text-fg-subtle">Soon</span>}
            {active && <span className="absolute left-0 -bottom-px h-0.5 w-full bg-accent rounded-full" />}
          </button>
        );
      })}
    </nav>
  );
}
