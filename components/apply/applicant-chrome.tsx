'use client';

/* Applicant chrome for pre-Shell C-end screens (welcome, account-setup, flow).
   Post-account pages show Topbar with profile; welcome / account-setup hide it
   (still registering — no personal console yet). */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Topbar from '@/components/layout/topbar';

export default function ApplicantChrome({
  children,
  className,
  hideProfile = false,
}: {
  children: ReactNode;
  className?: string;
  /** Logo-only header (welcome / account-setup before account exists). */
  hideProfile?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-bg',
        '[&_a]:cursor-pointer [&_button]:cursor-pointer [&_input]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer',
        className,
      )}
      data-zone="enterprise"
      data-mode="light"
    >
      <Topbar navigationHidden hideProfile={hideProfile} />
      <div className="flex min-h-0 flex-1 flex-col pt-16">{children}</div>
    </div>
  );
}
