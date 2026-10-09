'use client';

import { Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicInternBadgePreview } from '@/components/ui-legacy/intern-badge-status';
import { programmeAvailability } from '@/lib/public-internships';
import { signOut } from '@/lib/session';
import type { PublicInternshipProgramme } from '@/lib/types';
import { saveUtApplicantTaskIntent, saveUtApplicantVariant, saveUtCatalogPath, saveUtTrack } from '@/lib/ut-track';

export default function PublicProgrammeOverview({ programme, showBadgePreview = false }: { programme: PublicInternshipProgramme; showBadgePreview?: boolean }) {
  const router = useRouter();

  function apply() {
    if (programme.id === 'polytechnic') saveUtApplicantVariant('polytechnic');
    if (programme.id === 'undergraduate-student' || programme.id === 'undergraduate-scholar') saveUtApplicantVariant('undergraduate');
    saveUtTrack('applicant');
    saveUtCatalogPath('applicant');
    saveUtApplicantTaskIntent('apply');
    signOut();
    router.push('/login');
  }

  return (
    <div className="space-y-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-2xl font-normal">Programme Overview</h3>
          <p className="mt-3 max-w-3xl leading-7 text-fg-muted">{programme.overview}</p>
          {showBadgePreview && programme.badgeEligible && <PublicInternBadgePreview className="mt-5" />}
        </div>
        <dl className="space-y-5 self-start border border-border bg-surface p-6">
          <div><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Who May Apply</dt><dd className="mt-2">{programme.audience}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Internship Period</dt><dd className="mt-2">{programme.period}</dd></div>
          {programmeAvailability(programme) !== 'Applications are open' && <div><dt className="text-sm text-fg-muted">Application Timing</dt><dd className="mt-1 font-medium">{programmeAvailability(programme)}</dd></div>}
        </dl>
      </div>
      <section className="border-t border-border pt-6" aria-label="Project previews">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-normal">Projects in This Programme</h3>
          <Badge variant="subtle">{programme.projects.length} {programme.projects.length === 1 ? 'Project' : 'Projects'}</Badge>
        </div>
        <p className="mt-2 text-sm text-fg-muted">Project availability will be confirmed during your application.</p>
        {programme.projects.length === 0 && <p className="mt-5 text-sm text-fg-muted">Projects for this programme will be announced soon.</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {programme.projects.map(project => (
            <article key={project.id} className="border border-border bg-surface p-6">
              <Badge variant="subtle">{project.techDomain}</Badge>
              <h4 className="mt-4 text-2xl font-normal leading-tight">{project.title}</h4>
              <p className="mt-2 text-sm leading-6 text-fg-muted">{project.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-fg-muted">
                <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-warning" aria-hidden />{project.duration}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-warning" aria-hidden />{project.workingLocation}</span>
              </div>
              <p className="mt-3 text-sm text-fg-muted"><span className="font-medium text-fg">Skills: </span>{project.skills.join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>
      <section aria-label="Programme application" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-16">
          {programme.status === 'open' && <p className="text-sm text-fg-muted">Sign in to begin your application and explore project preferences.</p>}
          <Button onClick={apply} disabled={programme.status !== 'open'} className="w-full shrink-0 sm:ml-auto sm:w-auto sm:min-w-24">{programme.status === 'open' ? 'Apply' : 'Applications Not Open'}</Button>
        </div>
      </section>
    </div>
  );
}
