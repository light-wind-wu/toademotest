'use client';

/* Applicant chrome for pre-Shell C-end screens (welcome, account-setup, flow).
   After Singpass/Myinfo the role is set — show the same Topbar with profile. */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Topbar from '@/components/layout/topbar';

export default function ApplicantChrome({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
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
      <Topbar navigationHidden />
      <div className="flex min-h-0 flex-1 flex-col pt-16">{children}</div>
    </div>
  );
}
