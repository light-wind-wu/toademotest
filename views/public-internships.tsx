'use client';

import Image from 'next/image';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  GraduationCap,
  Mail,
  MapPin,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DstaPublicFooter from '@/components/apply/dsta-public-footer';
import DstaPublicHeader from '@/components/apply/dsta-public-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import programmesJson from '@/data/public-internship-programmes.json';
import { signOut } from '@/lib/session';
import type { PublicInternshipProgramme } from '@/lib/types';
import { saveUtApplicantTaskIntent, saveUtApplicantVariant, saveUtCatalogPath, saveUtTrack } from '@/lib/ut-track';
import { cn } from '@/lib/utils';

const internshipProgrammes = programmesJson as PublicInternshipProgramme[];

function statusVariant(status: PublicInternshipProgramme['status']) {
  return status === 'open' ? 'success' as const : 'subtle' as const;
}

export default function PublicInternships() {
  const router = useRouter();
  const projectsRef = useRef<HTMLElement>(null);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('polytechnic');
  const selectedProgramme = internshipProgrammes.find(programme => programme.id === selectedProgrammeId) ?? internshipProgrammes[0];

  function beginApplication(programmeId: string) {
    if (programmeId === 'polytechnic') saveUtApplicantVariant('polytechnic');
    if (programmeId === 'undergraduate-student' || programmeId === 'undergraduate-scholar') saveUtApplicantVariant('undergraduate');
    saveUtTrack('applicant');
    saveUtCatalogPath('applicant');
    saveUtApplicantTaskIntent('apply');
    signOut();
    router.push('/login');
  }

  function viewProjects(programmeId: string) {
    setSelectedProgrammeId(programmeId);
    window.requestAnimationFrame(() => projectsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <main id="top" className="min-h-[100dvh] bg-bg text-fg">
      <DstaPublicHeader />

      <section className="relative min-h-[260px] overflow-hidden border-b border-border bg-surface px-4 sm:px-6 lg:min-h-[280px] lg:px-10">
        <div className="absolute inset-y-0 right-[2%] hidden w-[46%] sm:block">
          <Image
            src="/images/dsta-internships-hero.jpg"
            alt="DSTA interns discussing technology and defence projects"
            fill
            priority
            sizes="(min-width: 640px) 46vw, 0px"
            className="object-contain object-right"
          />
        </div>
        <div className="relative mx-auto flex min-h-[260px] w-full max-w-[1360px] items-center py-8 lg:min-h-[280px]">
          <div className="max-w-2xl bg-surface py-3 pr-6 sm:w-[48%] sm:pr-8 lg:w-[46%]">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Internships</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-fg sm:whitespace-nowrap sm:text-[38px] lg:text-5xl">Choose an internship that fits</h1>
            <p className="mt-3 text-lg leading-7 text-fg-muted">Compare internship programmes by study stage, period and application availability.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-10 lg:py-12" aria-labelledby="internship-programmes-title">
        <div className="mx-auto w-full max-w-[1360px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="internship-programmes-title" className="text-3xl font-semibold tracking-tight text-fg">Internship programmes</h2>
              <p className="mt-2 text-fg-muted">Select a programme to view its projects and application status.</p>
            </div>
            <Badge variant="subtle">7 programmes</Badge>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {internshipProgrammes.map(programme => {
              const selected = programme.id === selectedProgramme.id;
              return (
                <article
                  key={programme.id}
                  className={cn(
                    'flex min-h-[280px] flex-col overflow-hidden rounded-xl border bg-surface transition-shadow',
                    selected ? 'border-accent shadow-md' : 'border-border',
                  )}
                >
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-bg-muted text-accent"><GraduationCap className="size-5" /></span>
                      <Badge variant={statusVariant(programme.status)}>{programme.statusLabel}</Badge>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold leading-6 text-fg">{programme.title}</h3>
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
                  <div className="border-t border-border bg-bg-subtle p-4">
                    <div className={cn('grid gap-2', programme.status === 'open' && 'sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2')}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        aria-expanded={selected}
                        aria-controls="programme-projects"
                        onClick={() => viewProjects(programme.id)}
                      >
                        {selected ? 'Viewing projects' : 'View projects'}
                        <ChevronDown className="size-4" />
                      </Button>
                      {programme.status === 'open' ? (
                        <Button size="sm" className="w-full" onClick={() => beginApplication(programme.id)}>
                          Apply programme<ArrowRight className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-center text-xs text-fg-muted">{programme.availabilityLabel}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        ref={projectsRef}
        id="programme-projects"
        className="scroll-mt-6 border-t border-border bg-surface px-4 py-10 sm:px-6 lg:px-10 lg:py-12"
        aria-labelledby="programme-projects-title"
      >
        <div className="mx-auto w-full max-w-[1360px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-accent">Selected programme</p>
              <h2 id="programme-projects-title" className="mt-2 text-3xl font-semibold tracking-tight text-fg">{selectedProgramme.title}</h2>
              <p className="mt-2 text-fg-muted">Explore projects available for this programme.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(selectedProgramme.status)}>{selectedProgramme.statusLabel}</Badge>
              <Badge variant="subtle">{selectedProgramme.projects.length} {selectedProgramme.projects.length === 1 ? 'project' : 'projects'}</Badge>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {selectedProgramme.projects.map(project => (
              <article key={project.id} className="flex flex-col rounded-xl border border-border bg-bg p-6 shadow-sm sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">{project.techDomain}</p>
                <h3 className="mt-2 text-xl font-semibold text-fg">{project.title}</h3>
                <p className="mt-3 text-sm leading-6 text-fg-muted">{project.description}</p>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-sm text-fg-muted">
                  <span className="inline-flex items-center gap-2"><Clock3 className="size-4" />{project.duration}</span>
                  <span className="inline-flex items-center gap-2"><MapPin className="size-4" />{project.workingLocation}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.skills.map(skill => <Badge key={skill} variant="subtle">{skill}</Badge>)}
                </div>
                {selectedProgramme.status !== 'open' ? (
                  <div className="mt-auto pt-6">
                    <p className="inline-flex items-center gap-2 rounded-lg bg-bg-muted px-4 py-3 text-sm font-medium text-fg-muted">
                      <CalendarDays className="size-4" />{selectedProgramme.availabilityLabel}
                    </p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface px-4 py-7 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-fg-muted"><Users className="size-4" />Not sure which internship fits?</p>
          <a href="mailto:internship@dsta.gov.sg" className="inline-flex items-center gap-2 font-medium text-accent hover:underline"><Mail className="size-4" />internship@dsta.gov.sg</a>
        </div>
      </section>
      <DstaPublicFooter full />
    </main>
  );
}
