'use client';

/* Shared empty placeholder for unfinished applicant menu routes. */
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Inbox } from 'lucide-react';
import Shell from '@/components/layout/shell';
import EmptyState from '@/components/ui-legacy/empty-state';
import { useRole } from '@/lib/role';
import { getNav } from '@/lib/ia-nav';

export default function EmptyPlaceholderPage() {
  const pathname = usePathname();
  const { role } = useRole();

  const title = useMemo(() => {
    const sections = getNav(role, { hasApplied: true, hasInternship: true });
    const match = sections.find(
      (s) =>
        pathname === s.route ||
        (s.route !== '/' && pathname.startsWith(`${s.route}/`)),
    );
    return match?.label ?? 'Page';
  }, [pathname, role]);

  return (
    <Shell activeRoute={pathname}>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <EmptyState
          icon={Inbox}
          title={title}
          description="No content here yet."
          size="md"
        />
      </div>
    </Shell>
  );
}
