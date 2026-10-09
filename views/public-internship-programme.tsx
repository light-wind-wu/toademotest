'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ToaPublicHeader from '@/components/apply/toa-public-header';
import ToaPublicFooter from '@/components/apply/toa-public-footer';
import PublicProgrammeOverview from '@/components/apply/public-programme-overview';
import { Badge } from '@/components/ui/badge';
import { publicInternshipProgrammes } from '@/lib/public-internships';

export default function PublicInternshipProgrammePage() {
  const params = useParams();
  const programme = publicInternshipProgrammes.find(item => item.id === params.programmeId);
  return (
    <main className="min-h-screen bg-bg pb-[calc(10rem+env(safe-area-inset-bottom))] text-fg sm:pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <ToaPublicHeader />
      <div className="mx-auto max-w-[1920px] px-6 py-6 lg:px-16">
        <Link href="/join-us/student/internships" className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-accent"><ArrowLeft className="size-4" />All Internship Programmes</Link>
        {programme ? <article className="mt-6">
          <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-warning"><span aria-hidden="true" className="h-px w-6 bg-warning" />Internships</p>
          <div className="mb-8 mt-5 flex flex-wrap items-center gap-4">
            <h1 className="max-w-5xl text-4xl font-normal leading-[1.08] tracking-tight text-warning sm:text-5xl lg:text-[clamp(3rem,4.4vw,5.5rem)]">{programme.title}</h1>
            <Badge variant={programme.status === 'open' ? 'success' : 'subtle'}>{programme.statusLabel}</Badge>
          </div>
          <PublicProgrammeOverview programme={programme} />
        </article> : <div className="py-16"><h1 className="text-3xl font-semibold">Programme unavailable</h1><p className="mt-3 text-fg-muted">Explore the public internship programmes to find an opportunity that fits.</p></div>}
      </div>
      <ToaPublicFooter />
    </main>
  );
}
