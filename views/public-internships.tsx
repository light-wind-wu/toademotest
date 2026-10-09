'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';
import ToaPublicFooter from '@/components/apply/toa-public-footer';
import ToaPublicHeader from '@/components/apply/toa-public-header';
import { Badge } from '@/components/ui/badge';
import { publicInternshipProgrammes, programmeAvailability } from '@/lib/public-internships';
import type { PublicInternshipProgramme } from '@/lib/types';

function statusVariant(status: PublicInternshipProgramme['status']) {
  return status === 'open' ? 'success' as const : 'subtle' as const;
}

export default function PublicInternships() {
  return (
    <main id="top" className="min-h-[100dvh] bg-bg text-fg">
      <ToaPublicHeader />

      <section className="mx-auto max-w-[1920px] px-6 pt-6 lg:px-16">
        <Link href="/join-us/student" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-accent"><ArrowLeft className="size-4" />All student programmes</Link>
        <div className="mt-6 grid items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-warning lg:text-sm"><span aria-hidden="true" className="h-px w-6 bg-warning" />Internships</p>
            <h1 className="mt-5 text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl lg:text-[clamp(3rem,4.4vw,5.5rem)]">Choose an internship <span className="text-warning">that fits</span></h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-fg-muted lg:text-lg">Compare internship programmes by study stage, period and application availability.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:pt-4">
            <Image src="/images/dsta-internships-hero.jpg" alt="" width={1635} height={442} priority sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full object-contain mix-blend-multiply" />
          </div>
        </div>
      </section>

      <section className="px-6 py-8 lg:px-16" aria-labelledby="internship-programmes-title">
        <div className="mx-auto w-full max-w-[1792px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="internship-programmes-title" className="text-2xl font-normal tracking-tight text-fg">Internship Programmes</h2>
            </div>
            <Badge variant="subtle">{publicInternshipProgrammes.length} programmes</Badge>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {publicInternshipProgrammes.map(programme => (
                <article
                  key={programme.id}
                  id={`programme-${programme.id}`}
                  className="flex min-h-[280px] scroll-mt-6 flex-col overflow-hidden border border-border bg-surface"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <GraduationCap aria-hidden="true" className="size-9 text-warning" />
                      <Badge variant={statusVariant(programme.status)}>{programme.statusLabel}</Badge>
                    </div>
                    <h3 className="mt-4 text-2xl font-normal leading-tight text-fg">{programme.title}</h3>
                    <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Who may apply</dt>
                        <dd className="mt-1.5 text-sm leading-5 text-fg">{programme.audience}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Internship period</dt>
                        <dd className="mt-1.5 text-sm leading-5 text-fg">{programme.period}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="px-6 pb-6 pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                      <Link id={`explore-${programme.id}`} href={`/join-us/student/internships/${programme.id}`} className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap text-base font-medium hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
                        Explore Programme<ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                    {programmeAvailability(programme) !== 'Applications are open' && <p className="mt-3 text-xs text-fg-muted">
                      {programmeAvailability(programme)}
                    </p>}
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      <ToaPublicFooter />
    </main>
  );
}
