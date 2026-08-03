'use client';

/* Lightweight chrome for pre-Shell applicant screens (welcome + account setup + apply).
   PC: logo + product title. Mobile: logo + search icon. */
import type { ReactNode } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApplicantChrome({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex min-h-screen flex-col bg-bg', className)}
      data-zone="enterprise"
      data-mode="light"
    >
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 bg-topbar-bg px-4 text-topbar-fg md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/images/dsta-logo-white.svg"
            alt="DSTA"
            width={120}
            height={40}
            className="h-8 w-auto shrink-0 md:h-7"
            priority
          />
          <span className="hidden truncate text-body-sm font-semibold tracking-wide text-topbar-fg/90 md:inline">
            Talent Outreach &amp; Acquisition
          </span>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            aria-label="Search"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-topbar-fg/90 hover:bg-topbar-fg/10"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}
