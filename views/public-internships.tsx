'use client';

import Image from 'next/image';
import {
  ArrowRight, CalendarDays, GraduationCap, Mail, Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import DstaPublicFooter from '@/components/apply/dsta-public-footer';
import DstaPublicHeader from '@/components/apply/dsta-public-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { signOut } from '@/lib/session';
import { saveUtApplicantTaskIntent, saveUtApplicantVariant, saveUtCatalogPath, saveUtTrack } from '@/lib/ut-track';

type BrowsableProgrammeId = 'PROG-0009' | 'PROG-0011';

type InternshipType = {
  id: string;
  title: string;
  description: string;
  audience: string;
  period: string;
  availability: 'open' | 'upcoming' | 'project-based';
  availabilityLabel: string;
};

const internshipTypes: InternshipType[] = [
  {
    id: 'jc-june',
    title: 'JC Internship (June)',
    description: 'For JC1 and JC2 students who want an internship during the June holidays.',
    audience: 'JC1 and JC2 students',
    period: 'June · 1 month',
    availability: 'upcoming',
    availabilityLabel: 'Applications open in February',
  },
  {
    id: 'jc-december',
    title: 'JC Internship (December)',
    description: 'For JC1 students who want an internship during the December holidays.',
    audience: 'JC1 students',
    period: '1–30 Dec 2026',
    availability: 'open',
    availabilityLabel: 'Applications open until 6 Sep 2026',
  },
  {
    id: 'post-school',
    title: 'Post-JC / Post-Polytechnic Internship',
    description: 'For students seeking experience before starting their undergraduate studies.',
    audience: 'Post-JC and post-polytechnic students',
    period: 'January–June · 2–6 months',
    availability: 'upcoming',
    availabilityLabel: 'Applications open in October',
  },
  {
    id: 'poly-university',
    title: 'Polytechnic and University Internship',
    description: 'Browse available projects that match your institution, discipline and availability.',
    audience: 'Polytechnic students and undergraduates',
    period: '3–6 months',
    availability: 'project-based',
    availabilityLabel: 'Projects available now',
  },
];

export default function PublicInternships() {
  const router = useRouter();

  function beginApplication() {
    saveUtTrack('applicant');
    saveUtCatalogPath('applicant');
    saveUtApplicantTaskIntent('apply');
    signOut();
    router.push('/login');
  }

  function beginProgrammeApplication(programmeId: BrowsableProgrammeId) {
    saveUtApplicantVariant(programmeId === 'PROG-0011' ? 'polytechnic' : 'undergraduate');
    beginApplication();
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
            <p className="mt-3 text-lg leading-7 text-fg-muted">Compare internship types by study stage, period and application availability.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-10 lg:py-12" aria-labelledby="internship-types-title">
        <div className="mx-auto w-full max-w-[1360px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="internship-types-title" className="text-3xl font-semibold tracking-tight text-fg">Types of internship</h2>
              <p className="mt-2 text-fg-muted">Select an open programme or note when applications begin.</p>
            </div>
            <Badge variant="subtle">4 internship types</Badge>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {internshipTypes.map((internship) => (
              <article key={internship.id} className="flex min-h-[310px] flex-col overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-bg-muted text-accent"><GraduationCap className="size-5" /></span>
                    <Badge variant={internship.availability === 'open' || internship.availability === 'project-based' ? 'success' : 'subtle'}>
                      {internship.availability === 'open' ? 'Open now' : internship.availability === 'project-based' ? 'Projects available' : 'Not open yet'}
                    </Badge>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-fg">{internship.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-fg-muted">{internship.description}</p>
                  <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Who may apply</dt>
                      <dd className="mt-1.5 text-sm font-medium text-fg">{internship.audience}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">Internship period</dt>
                      <dd className="mt-1.5 text-sm font-medium text-fg">{internship.period}</dd>
                    </div>
                  </dl>
                </div>

                {internship.availability === 'upcoming' ? (
                  <div className="flex items-center gap-2 border-t border-border bg-bg-muted px-6 py-4 text-sm font-medium text-fg-muted sm:px-7">
                    <CalendarDays className="size-4" />{internship.availabilityLabel}
                  </div>
                ) : null}

                {internship.availability === 'open' ? (
                  <div className="border-t border-border p-4 sm:px-7">
                    <Button className="w-full sm:w-auto" onClick={beginApplication}>Apply now<ArrowRight className="size-4" /></Button>
                    <span className="mt-2 block text-xs text-fg-muted sm:ml-3 sm:inline">{internship.availabilityLabel}</span>
                  </div>
                ) : null}

                {internship.availability === 'project-based' ? (
                  <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2 sm:px-7">
                    <a
                      href="https://secure.dc5.pageuppeople.com/apply/845/gateway/Default.aspx?c=apply&sJobIDs=2003775&SourceTypeID=805&sLanguage=en"
                      className={buttonVariants({ variant: 'solid', size: 'sm' })}
                    >
                      Explore Polytechnic Students<ArrowRight className="size-4" />
                    </a>
                    <Button size="sm" onClick={() => beginProgrammeApplication('PROG-0009')}>Explore University<ArrowRight className="size-4" /></Button>
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
