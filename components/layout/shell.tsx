'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IaRail from './ia-rail';
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

export default function Shell({ children, activeRoute, hideNavigation = false }: ShellProps) {
  const { signedIn } = useSession();
  const { role, roleReady } = useRole();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Each audience owns one half of the portal: candidates live under /apply/*,
  // internal staff live everywhere else. A signed-in user whose role doesn't match
  // the route's audience is in the wrong place (e.g. an applicant URL-hopping to a
  // staff screen, or vice-versa).
  const onApplyRoute = activeRoute.startsWith('/apply');
  const roleMismatch = roleReady && isApplicantRole(role) !== onApplyRoute;

  // Auth gate — the portal's scope begins at a sign-in screen. Unauthenticated
  // visitors are sent to the matching login: candidates (/apply/*) → Singpass
  // sign-in, internal staff → the Corppass console sign-in. Signed-in users on the
  // wrong audience's route are bounced to their own role home (no cross-audience
  // access — protects applicant PII and staff-only tooling).
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
      {!hideNavigation && <IaRail activeRoute={activeRoute} />}
      <div className={cn('flex min-h-screen flex-col', !hideNavigation && 'md:ml-[112px]')}>
        <Topbar navigationHidden={hideNavigation} />
        {/* Design spec: spacious content, responsive max-width ~1440px, fluid
            below with clamp(24px,2.6vw,40px) side padding. Content scroller gets
            the kinetic overscroll bounce. */}
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
