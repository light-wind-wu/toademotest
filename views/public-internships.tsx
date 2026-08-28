'use client';

import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  Mail,
  Menu,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/session';
import { saveUtApplicantTaskIntent, saveUtCatalogPath, saveUtTrack } from '@/lib/ut-track';
import { cn } from '@/lib/utils';

const internshipBenefits = [
  {
    title: 'Dream Big and Innovate',
    body: 'Turn your ideas into innovative solutions that will be pivotal to Singapore’s defence and security.',
    icon: Lightbulb,
  },
  {
    title: 'Work on What You Care About',
    body: 'Work on meaningful and challenging projects that excite you, where your creativity and passion can shine.',
    icon: HeartHandshake,
  },
  {
    title: 'Expand Your Skill Set',
    body: 'Learn across engineering, infocomm technology and cybersecurity, with experienced mentors by your side.',
    icon: GraduationCap,
  },
  {
    title: 'Be Part of the DSTA Family',
    body: 'Build your network, level up your skills and take part in events and activities with fellow interns.',
    icon: Users,
  },
];

const internshipTypes = [
  {
    title: 'JC Internship (June)',
    audience: 'For JC1 and JC2 students',
    period: 'June · 1 month',
    availability: 'Applications open in February',
  },
  {
    title: 'JC Internship (December)',
    audience: 'For JC1 students',
    period: '1 Dec 2026 – 30 Dec 2026',
    availability: 'Applications open till 31 Aug 2026',
  },
  {
    title: 'Post-JC / Post-Polytechnic Internship',
    audience: 'Before starting undergraduate studies',
    period: 'January – June · 2 to 6 months',
    availability: 'Applications open in October',
  },
  {
    title: 'Polytechnic and University Internship',
    audience: 'For students currently pursuing their studies',
    period: '3 to 6 months',
    availability: 'Subject to project availability',
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

  return (
    <main className="min-h-[100dvh] bg-bg text-fg">
      <header className="border-b border-topbar-fg/10 bg-topbar-bg text-topbar-fg">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-5 px-4 sm:px-6 lg:px-10">
          <button type="button" className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-topbar-fg-muted hover:bg-topbar-fg/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-topbar-fg" aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <Image src="/images/dsta-logo-white.svg" alt="DSTA" width={86} height={36} className="h-auto w-[86px]" priority />
          <nav className="ml-4 hidden items-center gap-7 text-sm lg:flex" aria-label="Primary navigation">
            {['Who We Are', 'What We Do', 'Join Us', 'What’s On'].map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  'cursor-pointer hover:text-topbar-fg',
                  item === 'Join Us' ? 'font-semibold text-topbar-fg' : 'text-topbar-fg-muted',
                )}
              >
                {item}
              </button>
            ))}
          </nav>
          <button type="button" className="ml-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-topbar-fg-muted hover:bg-topbar-fg/10" aria-label="Search">
            <Search className="size-5" />
          </button>
        </div>
      </header>

      <section className="border-b border-border bg-bg-subtle">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-10">
          <button type="button" onClick={() => router.push('/apply/dashboard')} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-4" />
            Back to Applicant Home
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="mx-auto grid min-h-[520px] w-full max-w-[1440px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:px-10 lg:py-16">
          <div className="relative z-[1] max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Internship Programme</p>
            <h1 className="mt-4 max-w-[720px] text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl lg:text-6xl">DSTA Internships</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-fg-muted">
              Want to gain real-world work experience in a fun and dynamic environment? Develop innovative solutions for Singapore&apos;s defence and security through an unforgettable learning experience.
            </p>
            <Button size="lg" className="mt-8" onClick={beginApplication}>
              Submit an Application
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="relative hidden min-h-[390px] lg:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-xl border border-border bg-bg-subtle" />
            <Image src="/images/ship-line-art-motion.svg" alt="" fill priority className="object-contain object-center p-8" sizes="(min-width: 1024px) 50vw, 0px" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Realise Your Full Potential</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">An immersive learning experience, with you in mind</h2>
          <p className="mt-4 text-base leading-7 text-fg-muted">Hone your technical skills and enrich your experience while solving complex, real-world problems.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {internshipBenefits.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-6 sm:p-8">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-bg-muted text-accent"><Icon className="size-5" /></span>
              <h3 className="mt-5 text-xl font-semibold text-fg">{title}</h3>
              <p className="mt-3 leading-7 text-fg-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-bg-subtle">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Why Intern With Us</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Broaden your network. Deepen your knowledge.</h2>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
              <Sparkles className="size-6 text-accent" />
              <p className="mt-5 text-lg leading-8 text-fg-muted">Learn from experienced mentors including DSTA engineers and developers, as well as industry partners worldwide.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Types of Internship</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Find an opportunity for your stage of study</h2>
          <p className="mt-4 leading-7 text-fg-muted">Opportunities are available for Junior College, Polytechnic and University students across a wide variety of projects.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {internshipTypes.map((internship) => (
            <article key={internship.title} className="flex min-h-64 flex-col rounded-xl border border-border bg-surface p-6 sm:p-8">
              <BriefcaseBusiness className="size-6 text-accent" />
              <h3 className="mt-5 text-xl font-semibold text-fg">{internship.title}</h3>
              <p className="mt-2 text-sm text-fg-muted">{internship.audience}</p>
              <div className="mt-auto border-t border-border pt-5 text-sm">
                <p className="font-medium text-fg">{internship.period}</p>
                <p className="mt-2 text-fg-muted">{internship.availability}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-bg-subtle">
        <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">Connect With Us</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-fg">Human Resource (Outreach)</h2>
            <p className="mt-3 inline-flex items-center gap-2 text-fg-muted"><Mail className="size-4" />internship@dsta.gov.sg</p>
          </div>
          <Button size="lg" onClick={beginApplication}>Submit an Application<ArrowRight className="size-4" /></Button>
        </div>
      </section>

    </main>
  );
}
