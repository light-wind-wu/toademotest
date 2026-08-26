'use client';

/* Shared shell for email registration steps 1/2/3/4/5 — black masthead + subtitle,
   optional "Back to login" breadcrumb, optional hero banner.
   - layout="card" (default): centered white card, form left + illustration right.
   - layout="stack": full-width hero + centered card stack below, no illustration, no background.
*/
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegisterShellProps {
  children: React.ReactNode;
  illustrationSrc?: string;
  illustrationAlt?: string;
  showBackLink?: boolean;
  hero?: React.ReactNode;
  footer?: React.ReactNode;
  layout?: 'card' | 'stack';
  className?: string;
}

export default function RegisterShell({
  children,
  illustrationSrc,
  illustrationAlt = '',
  showBackLink = true,
  hero,
  footer,
  layout = 'card',
  className,
}: RegisterShellProps) {
  const isStack = layout === 'stack';

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
      {showBackLink && (
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
      )}

      {/* Optional hero banner */}
      {hero && (
        <div
          className={cn(
            'relative z-10 w-full',
            isStack ? '' : 'flex flex-1 items-center justify-center px-5 py-10',
          )}
        >
          {hero}
        </div>
      )}

      {/* Centered background image (only for card layout) */}
      {!isStack && (
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
      )}

      {/* Main content */}
      {!isStack ? (
        /* Card layout: centered card with form + illustration */
        <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10">
          <div
            className="grid w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-2xl border bg-white lg:grid-cols-[1fr_1fr]"
            style={{ borderColor: 'rgba(231, 228, 221, 1)' }}
          >
            <div className="p-6 lg:p-10">{children}</div>
            <div className="pointer-events-none relative hidden min-h-[360px] lg:block">
              <Image
                src={illustrationSrc || '/images/create-account-right.png'}
                alt={illustrationAlt}
                fill
                className="object-contain object-center"
                sizes="(min-width: 1024px) 50vw, 0px"
                priority
              />
            </div>
          </div>
        </main>
      ) : (
        /* Stack layout: full-width hero already above, cards below */
        <main className="relative z-10 flex flex-1 flex-col px-6">{children}</main>
      )}

      {/* Optional footer — full-width bar, same outer padding as content */}
      {footer && isStack && (
        <div
          className="z-30 flex h-[68px] w-full items-center border-t border-border bg-surface px-6"
        >
          <div className="mx-auto flex w-full max-w-none items-center justify-between gap-3">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
