'use client';

/* Shared shell for email registration steps 1/2/3/5 — black masthead + subtitle,
   "Back to login" below header, large centered white card with form left + illustration right. */
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegisterShellProps {
  children: React.ReactNode;
  illustrationSrc: string;
  illustrationAlt?: string;
  className?: string;
}

export default function RegisterShell({
  children,
  illustrationSrc,
  illustrationAlt = '',
  className,
}: RegisterShellProps) {
  return (
    <div
      data-zone="enterprise"
      data-mode="light"
      className={cn('relative flex min-h-screen flex-col overflow-hidden', className)}
    >
      {/* Black masthead */}
      <header
        className="relative z-20 flex h-16 w-full items-center gap-3 px-5 lg:px-10"
        style={{ background: 'rgba(10, 22, 40, 1)' }}
      >
        <Image
          src="/images/dsta-logo-white.png"
          alt="DSTA"
          width={120}
          height={32}
          className="h-7 w-auto"
          priority
        />
        <span className="text-[14px] font-medium text-white/90 lg:text-[16px]">
          Talent Outreach &amp; Acquisition
        </span>
      </header>

      {/* Back to login breadcrumb */}
      <div className="relative z-20 w-full px-5 py-4 lg:px-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium"
          style={{ color: 'rgba(69, 85, 108, 1)' }}
        >
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
      </div>

      {/* Centered background image */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <Image
          src="/images/create-account-bg.png"
          alt=""
          fill
          className="object-contain object-center max-lg:hidden"
          sizes="100vw"
          priority
        />
        <Image
          src="/images/create-account-bg-m.png"
          alt=""
          fill
          className="object-contain object-center lg:hidden"
          sizes="100vw"
          priority
        />
      </div>

      {/* Main content: large centered card */}
      <main className="relative z-10 flex flex-1 items-start justify-center px-5 pb-10 lg:items-center">
        <div
          className="grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-2xl border bg-white lg:grid-cols-[1fr_1fr]"
          style={{ borderColor: 'rgba(231, 228, 221, 1)' }}
        >
          {/* Form column */}
          <div className="p-6 lg:p-10">{children}</div>

          {/* Illustration column */}
          <div className="pointer-events-none relative hidden min-h-[360px] lg:block">
            <Image
              src={illustrationSrc}
              alt={illustrationAlt}
              fill
              className="object-contain object-center"
              sizes="(min-width: 1024px) 50vw, 0px"
              priority
            />
          </div>
        </div>
      </main>
    </div>
  );
}
