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
  const [ready, setReady] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (raw) setCollapsed(raw === 'true');
    } catch {/* noop */} finally {
      setReady(true);
    }
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
      {!hideNavigation && <CollapsibleSidebar activeRoute={activeRoute} collapsed={collapsed} ready={ready} onToggle={handleToggle} />}
      <div className={cn('flex min-h-screen flex-col', ready && 'transition-all duration-200 ease-in-out', !hideNavigation && (collapsed ? 'md:ml-16' : 'md:ml-64'))}>
        <Topbar navigationHidden={hideNavigation} />
        <main className="flex-1 pt-[76px] md:pt-[80px] pb-8">
          <KineticBounce fullBleed={hideNavigation}>
            <div className="mx-auto w-full px-[clamp(24px,2.6vw,40px)]">
              {!hideNavigation && <SectionTabs activeRoute={activeRoute} />}
              {children}
            </div>
          </KineticBounce>
        </main>
      </div>
    </>
  );
}
