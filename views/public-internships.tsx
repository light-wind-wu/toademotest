'use client';

import Image from 'next/image';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Menu, Search, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/session';
import {
  saveUtApplicantTaskIntent,
  saveUtCatalogPath,
  saveUtTrack,
} from '@/lib/ut-track';

const internshipPaths = [
  {
    title: 'University Internship',
    body: 'Work on an engineering, digital or cybersecurity project with guidance from a DSTA mentor.',
    audience: 'For university students',
  },
  {
    title: 'Polytechnic Internship',
    body: 'Apply your course knowledge to real defence technology challenges in a professional team.',
    audience: 'For polytechnic students',
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
          <button
            type="button"
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-topbar-fg-muted hover:bg-topbar-fg/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-topbar-fg"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <Image
            src="/images/dsta-logo-white.svg"
            alt="DSTA"
            width={86}
            height={36}
            className="h-auto w-[86px]"
            priority
          />
          <nav className="ml-4 hidden items-center gap-7 text-sm lg:flex" aria-label="Primary navigation">
            <button type="button" className="cursor-pointer text-topbar-fg-muted hover:text-topbar-fg">Who We Are</button>
            <button type="button" className="cursor-pointer text-topbar-fg-muted hover:text-topbar-fg">What We Do</button>
            <button type="button" className="cursor-pointer font-semibold text-topbar-fg">Join Us</button>
            <button type="button" className="cursor-pointer text-topbar-fg-muted hover:text-topbar-fg">What&apos;s On</button>
          </nav>
          <button
            type="button"
            className="ml-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-topbar-fg-muted hover:bg-topbar-fg/10"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
        </div>
      </header>

      <section className="border-b border-border bg-bg-subtle">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => router.push('/apply/dashboard')}
            className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            Back to Applicant Home
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div className="mx-auto grid min-h-[520px] w-full max-w-[1440px] items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:px-10 lg:py-16">
          <div className="relative z-[1] max-w-2xl">
            <p className="text-sm font-semibold text-accent">DSTA Internships</p>
            <h1 className="mt-4 max-w-[720px] text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Build technology that matters
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-fg-muted">
              Gain hands-on experience in engineering, digital technology and cybersecurity while contributing to Singapore&apos;s defence.
            </p>
            <Button size="lg" className="mt-8" onClick={beginApplication}>
              Submit an Application
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="relative hidden min-h-[390px] lg:block" aria-hidden="true">
            <div className="absolute inset-0 rounded-xl border border-border bg-bg-subtle" />
            <Image
              src="/images/ship-line-art-motion.svg"
              alt=""
              fill
              priority
              className="object-contain object-center p-8"
              sizes="(min-width: 1024px) 50vw, 0px"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-accent">Choose your internship path</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Put your knowledge into practice
          </h2>
          <p className="mt-4 text-base leading-7 text-fg-muted">
            Interns work alongside experienced professionals, learn from dedicated mentors and contribute to meaningful projects.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {internshipPaths.map((path, index) => (
            <article
              key={path.title}
              className="grid min-h-[260px] grid-cols-[auto_1fr] gap-x-5 rounded-xl border border-border bg-surface p-6 sm:p-8"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-bg-muted text-accent">
                {index === 0 ? <BriefcaseBusiness className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <div>
                <p className="text-sm font-medium text-fg-muted">{path.audience}</p>
                <h3 className="mt-2 text-2xl font-semibold text-fg">{path.title}</h3>
                <p className="mt-4 max-w-xl leading-7 text-fg-muted">{path.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-bg-subtle">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-20">
          <div>
            <p className="text-sm font-semibold text-accent">What to expect</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg">A supported learning experience</h2>
          </div>
          <dl className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-6">
              <dt className="font-semibold text-fg">Real project work</dt>
              <dd className="mt-2 leading-7 text-fg-muted">Contribute to work in engineering, digital solutions or cybersecurity.</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <dt className="font-semibold text-fg">Mentor guidance</dt>
              <dd className="mt-2 leading-7 text-fg-muted">Learn from specialists who will guide your project and development.</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6 sm:col-span-2">
              <dt className="font-semibold text-fg">Professional exposure</dt>
              <dd className="mt-2 max-w-2xl leading-7 text-fg-muted">Understand how multidisciplinary teams develop technology for Singapore&apos;s defence and security.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20">
        <div className="rounded-xl border border-border bg-surface p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-fg">Ready to apply?</h2>
            <p className="mt-3 leading-7 text-fg-muted">Sign in with Singpass to begin the B1.1 application flow.</p>
          </div>
          <Button size="lg" className="mt-6 shrink-0 lg:mt-0" onClick={beginApplication}>
            Submit an Application
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-topbar-fg/10 bg-topbar-bg text-topbar-fg">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-8 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <Image
            src="/images/dsta-logo-white.svg"
            alt="DSTA"
            width={86}
            height={36}
            className="h-auto w-[86px]"
          />
          <p className="text-topbar-fg-muted">Defence Science and Technology Agency</p>
        </div>
      </footer>
    </main>
  );
}
