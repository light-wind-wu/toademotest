import Link from 'next/link';
import { ArrowRight, Atom, Brain, Lightbulb, Presentation } from 'lucide-react';
import StudentPublicHeader from '@/components/apply/student-public-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const programmes = [
  { title: 'DSTA Internships', icon: Lightbulb, description: 'Gain hands-on experience through projects with teams working on defence technology.', href: '/join-us/student/internships' },
  { title: 'Young Defence Scientist Programme (YDSP)', icon: Atom, description: 'Explore science and technology early through camps, research projects, mentorship and showcases.' },
  { title: 'BrainHack', icon: Brain, description: 'Take on challenges, build ideas and experience the excitement of applying technology to defence problems.' },
  { title: 'DSTA Tech UP', icon: Presentation, description: 'Gain early access to internships, curated courses and networking opportunities as an undergraduate.' },
];

export default function PublicStudentProgrammes() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <StudentPublicHeader />
      <main className="mx-auto max-w-[1920px] px-6 py-6 lg:px-16">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-warning lg:text-sm"><span aria-hidden="true" className="h-px w-6 bg-warning" />Programmes for different journeys</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
          <h1 className="text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl lg:text-[clamp(3rem,4.4vw,5.5rem)]">Find the <span className="text-warning">Path</span> That<br /><span className="text-warning">Fits You.</span></h1>
          <div className="space-y-3 text-base leading-relaxed text-fg-muted lg:text-lg">
            <p>Explore where your future could begin through the various paths.</p>
            <p>Your first experience with DSTA could open the door to future internships, scholarships, undergraduate programmes or a career in defence technology.</p>
          </div>
        </div>
        <section aria-label="DSTA programmes" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
          {programmes.map(({ title, icon: Icon, description, href }) => {
            const content = <>
              <Icon aria-hidden="true" className="mb-4 size-9 shrink-0 text-warning" />
              <h2 className="mb-4 text-2xl font-normal leading-tight">{title}</h2>
              <p className="text-base leading-relaxed text-fg-muted">{description}</p>
              <span className={cn('mt-auto flex items-center gap-2 pt-6 text-base font-medium', href && 'group-hover:text-accent group-focus-visible:text-accent')}>Explore More <ArrowRight aria-hidden="true" className="size-4" /></span>
            </>;
            return <Card key={title} className="rounded-none shadow-none">
              {href ? <Link href={href} className="group flex h-full min-h-[340px] flex-col p-6 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" aria-label="Explore DSTA Internships">{content}</Link>
                : <div className="flex h-full min-h-[340px] flex-col p-6">{content}</div>}
            </Card>;
          })}
        </section>
      </main>
    </div>
  );
}
