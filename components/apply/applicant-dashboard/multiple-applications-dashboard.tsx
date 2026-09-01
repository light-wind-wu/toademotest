'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, Check, CheckCircle2, Circle, Clock3 } from 'lucide-react';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const compactStages = ['Submitted', 'Under review', 'Interview', 'Outcome'] as const;

const applications = [
  {
    id: 'app-ui-2027',
    detailRoute: '/apply/applications/app-ui-2027',
    programme: 'University Internship 2027',
    badge: 'Interview invitation',
    actionBadge: 'Action required',
    summary: 'Next step: Select your interview availability',
    deadline: 'Due 3 Sep 2026',
    currentStage: 2,
    completedStages: 2,
  },
  {
    id: 'app-research-2027',
    detailRoute: '/apply/applications',
    programme: 'Research Internship 2027',
    badge: 'Under review',
    actionBadge: null,
    summary: 'Your application is under review. We’ll be in touch soon.',
    deadline: null,
    currentStage: 1,
    completedStages: 1,
  },
] as const;

export default function MultipleApplicationsDashboard({
  archetypeImage,
  activityIllustration,
  onSelectTimeslots,
}: {
  archetypeImage: string;
  activityIllustration: string;
  onSelectTimeslots: () => void;
}) {
  const router = useRouter();

  return (
    <section className="relative -mt-4 mx-auto w-full max-w-[1440px] px-4 pb-8 pt-0 lg:px-6" aria-label="Multiple active applications dashboard">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_314px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <article className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-5 sm:p-7 lg:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-medium text-fg-muted">Primary spotlight</p>
                  <Badge variant="warning">Action required</Badge>
                </div>
                <h2 className="mt-3 text-[24px] font-semibold leading-8 tracking-tight text-fg">Choose your interview availability</h2>
                <p className="mt-2 text-[15px] font-semibold leading-6 text-fg">University Internship 2027</p>
                <p className="mt-1 max-w-2xl text-[14px] leading-6 text-fg-muted">Select your preferred timeslots so we can confirm your interview.</p>
                <p className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-fg">
                  <Clock3 className="size-4 text-fg-muted" aria-hidden />
                  Due 3 Sep 2026
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={onSelectTimeslots}>Select Timeslots<ArrowRight className="size-4" aria-hidden /></Button>
                  <Button variant="outline" onClick={() => router.push('/apply/applications/app-ui-2027')}>View Application</Button>
                </div>
              </div>

              <div className="relative min-h-[300px] border-t border-border bg-accent lg:border-l lg:border-t-0">
                <Image
                  src="/images/applicant-dashboard-interview-invitation.png"
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="320px"
                  priority
                />
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" aria-labelledby="my-applications-title">
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <p className="text-[13px] text-fg-muted">Application overview</p>
              <h2 id="my-applications-title" className="mt-1 text-[18px] font-semibold leading-6 text-fg">My applications</h2>
            </div>
            <div className="divide-y divide-border">
              {applications.map((application) => (
                <div key={application.id} className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(240px,0.85fr)_minmax(360px,1.15fr)] xl:items-center">
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold leading-6 text-fg">{application.programme}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={application.currentStage === 1 ? 'success' : 'subtle'}>{application.badge}</Badge>
                      {application.actionBadge ? <Badge variant="warning">{application.actionBadge}</Badge> : null}
                    </div>
                    <p className="mt-3 text-[13px] leading-5 text-fg-muted">{application.summary}</p>
                    {application.deadline ? (
                      <p className="mt-2 inline-flex items-center gap-2 text-[12px] font-medium text-fg">
                        <CalendarDays className="size-4 text-fg-muted" aria-hidden />{application.deadline}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <ol className="grid grid-cols-4" aria-label={`${application.programme} progress`}>
                      {compactStages.map((stage, index) => {
                        const done = index < application.completedStages;
                        const current = index === application.currentStage;
                        return (
                          <li key={stage} className="relative flex min-w-0 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
                            {index < compactStages.length - 1 ? (
                              <span className={cn('absolute left-1/2 right-[-50%] top-[11px] h-px bg-border', done && 'bg-accent')} aria-hidden />
                            ) : null}
                            <span className={cn('relative z-[1] inline-flex size-6 items-center justify-center rounded-full border bg-surface', done ? 'border-accent bg-accent text-accent-fg' : current ? 'border-accent text-accent' : 'border-border text-fg-muted')}>
                              {done ? <Check className="size-3.5" aria-hidden /> : current ? <Circle className="size-2.5 fill-current" aria-hidden /> : null}
                            </span>
                            <span className={cn('mt-2 hidden text-[10px] leading-4 sm:block', done || current ? 'font-semibold text-fg' : 'text-fg-muted')}>{stage}</span>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="mt-5 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => router.push(application.detailRoute)}>
                        View Application<ArrowRight className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="relative min-h-[250px] overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="multi-activity-title">
            <div className="pointer-events-none absolute bottom-0 right-4 hidden h-[210px] w-[200px] sm:block" aria-hidden>
              <Image src={activityIllustration} alt="" fill className="object-contain object-right-bottom" sizes="200px" />
            </div>
            <div className="relative z-[1] sm:max-w-[calc(100%-210px)]">
              <p className="text-[13px] text-fg-muted">Latest activity</p>
              <h2 id="multi-activity-title" className="mt-1 text-[18px] font-semibold leading-6 text-fg">Updates across your applications</h2>
              <ol className="mt-5 divide-y divide-border">
                {[
                  ['Interview invitation received', 'University Internship 2027', '1 Sep 2026, 10:30 AM'],
                  ['Application under review', 'Research Internship 2027', '31 Aug 2026, 4:15 PM'],
                  ['Application submitted', 'Research Internship 2027', '30 Aug 2026, 2:00 PM'],
                ].map(([title, programme, date], index) => (
                  <li key={`${title}-${programme}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-muted text-accent" aria-hidden>
                      {index === 0 ? <CheckCircle2 className="size-4" /> : <Circle className="size-3" />}
                    </span>
                    <div className="min-w-0 flex-1 sm:flex sm:justify-between sm:gap-4">
                      <div><p className="text-[13px] font-medium leading-5 text-fg">{title}</p><p className="text-[12px] leading-4 text-fg-muted">{programme}</p></div>
                      <p className="mt-1 shrink-0 text-[12px] leading-5 text-fg-muted sm:mt-0">{date}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <aside className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="multi-guide-title">
            <p className="text-[13px] text-fg-muted">Task guide</p>
            <h2 id="multi-guide-title" className="mt-1 text-[18px] font-semibold leading-6 text-fg">Interview Guide</h2>
            <p className="mt-2 text-[13px] leading-5 text-fg-muted">For your highest-priority application task.</p>
            <ul className="mt-5 space-y-3">
              {['Understand the interview process', 'Prepare for your interview', 'Tips for a great interview'].map((item) => (
                <li key={item} className="flex gap-3 text-[13px] leading-5 text-fg"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /><span>{item}</span></li>
              ))}
            </ul>
            <OutOfScopeTooltip><Button variant="outline" className="mt-6 w-full">View Interview Guide</Button></OutOfScopeTooltip>
          </aside>

          <aside className="relative min-h-[423px] overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="multi-archetype-title">
            <div className="pointer-events-none absolute inset-0" aria-hidden><Image src={archetypeImage} alt="" fill className="object-contain object-bottom lg:object-cover" sizes="314px" /></div>
            <div className="relative z-[1]">
              <p className="text-[12px] leading-5 text-fg-muted">Your Defender Archetype</p>
              <h2 id="multi-archetype-title" className="mt-1 text-[24px] font-semibold leading-8 text-accent">The Sentinel</h2>
              <p className="mt-2 max-w-[220px] text-[13px] leading-5 text-fg-muted">You protect what matters with intelligence and precision.</p>
            </div>
            <OutOfScopeTooltip><Button className="absolute bottom-6 left-5 z-[1] sm:left-6" size="sm">Play Quiz Again</Button></OutOfScopeTooltip>
          </aside>
        </div>
      </div>
    </section>
  );
}
