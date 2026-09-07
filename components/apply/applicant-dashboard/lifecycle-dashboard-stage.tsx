'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CheckCircle2, Circle, Clock3, ListChecks, X } from 'lucide-react';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ApplicantDashboardJourneyStage,
  ApplicantDashboardPostInternshipItem,
  ApplicantDashboardStateConfig,
} from '@/lib/types';

const journeyStages: ReadonlyArray<{ id: ApplicantDashboardJourneyStage; label: string }> = [
  { id: 'application', label: 'Submitted' },
  { id: 'review', label: 'Under review' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Outcome' },
];

export default function LifecycleDashboardStage({
  config,
  archetypeImage,
  statusIllustration,
  activityIllustration,
  journeyTopDecoration,
  journeyTopMobileDecoration,
  onPrimaryAction,
}: {
  config: ApplicantDashboardStateConfig;
  archetypeImage: string;
  statusIllustration: string;
  activityIllustration: string;
  journeyTopDecoration: string;
  journeyTopMobileDecoration: string;
  onPrimaryAction: () => void;
}) {
  const router = useRouter();
  if (config.state === 'draft_application') {
    return (
      <DraftApplicationDashboard
        config={config}
        archetypeImage={archetypeImage}
        statusIllustration={statusIllustration}
        activityIllustration={activityIllustration}
        journeyTopDecoration={journeyTopDecoration}
        onPrimaryAction={onPrimaryAction}
      />
    );
  }
  if (config.state === 'application_submitted') {
    return (
      <SubmittedApplicationDashboard
        config={config}
        archetypeImage={archetypeImage}
        statusIllustration={statusIllustration}
        activityIllustration={activityIllustration}
        journeyTopDecoration={journeyTopDecoration}
      />
    );
  }
  const isWaiting = config.pattern === 'waiting';
  const isClosed = config.pattern === 'closed';
  const isCompleted = config.pattern === 'completed';
  const priorityImage = config.spotlightImage ?? null;
  const useMutedPriority = (isWaiting || isClosed || isCompleted) && !priorityImage;
  const visibleJourneyStages = config.terminalStage
    ? journeyStages.slice(0, journeyStages.findIndex((stage) => stage.id === config.terminalStage) + 1)
    : journeyStages;
  const activityHeading = isClosed
    ? 'Application history'
    : config.state === 'internship_in_progress' || config.state === 'offboarding_required' || config.state === 'internship_completed'
      ? 'Recent internship activity'
      : 'Recent application activity';

  return (
    <section className="relative -mt-4 mx-auto w-full max-w-[1440px] px-4 pb-8 pt-0 lg:px-6" aria-label={`${config.badge} dashboard content`}>
      <article className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[360px] opacity-35 lg:block" aria-hidden>
          <Image src={statusIllustration} alt="" fill className="object-contain object-right-bottom" sizes="360px" />
        </div>

        <div className="relative z-[1] grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-5 sm:p-7 lg:p-8">
            <p className="text-[13px] font-medium text-fg-muted">Primary spotlight</p>
            <h2 className="mt-3 max-w-3xl text-[24px] font-semibold leading-8 tracking-tight text-fg">{config.spotlightTitle}</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-fg-muted">{config.spotlightCopy}</p>

            <dl className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-3">
              {config.metadata.map((item) => (
                <div key={`${item.label}-${item.value}`} className="min-w-0">
                  <dt className="text-[12px] leading-4 text-fg-muted">{item.label}</dt>
                  <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">{item.value}</dd>
                </div>
              ))}
            </dl>

            {config.dueText ? (
              <p className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-fg">
                <Clock3 className="size-4 text-fg-muted" aria-hidden />
                {config.dueText}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {config.primaryAction ? (
                <Button onClick={onPrimaryAction}>
                  {config.primaryAction.label}
                  <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
              ) : null}
              {config.secondaryAction ? (
                config.secondaryAction.route ? (
                  <Button variant="outline" onClick={() => router.push(config.secondaryAction!.route!)}>{config.secondaryAction.label}</Button>
                ) : (
                  <OutOfScopeTooltip><Button variant="outline">{config.secondaryAction.label}</Button></OutOfScopeTooltip>
                )
              ) : null}
            </div>
          </div>

          <div className={cn('relative border-t border-border p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8', useMutedPriority ? 'bg-bg-muted' : 'bg-accent text-accent-fg', priorityImage && 'max-lg:min-h-[300px]')}>
            {priorityImage ? (
              <Image
                src={priorityImage}
                alt=""
                fill
                className="object-contain object-right-bottom lg:object-cover lg:object-center"
                sizes="320px"
              />
            ) : null}
            <div className="relative z-[1]">
              <span className={cn('inline-flex size-10 items-center justify-center rounded-full', isClosed ? 'bg-danger/15 text-danger' : useMutedPriority ? 'bg-success/15 text-success' : 'bg-surface/15 text-accent-fg')} aria-hidden>
                {isClosed ? <X className="size-5" strokeWidth={2} /> : isWaiting || isCompleted ? <Check className="size-5" strokeWidth={2} /> : <ListChecks className="size-5" />}
              </span>
              <p className={cn('mt-5 text-[18px] font-semibold leading-6', useMutedPriority ? 'text-fg' : 'text-accent-fg')} role="status">
                {isClosed ? 'Application closed' : isWaiting ? 'You’re all caught up' : isCompleted ? 'Journey completed' : 'Your next priority'}
              </p>
              <p className={cn('mt-2 text-[14px] leading-5', useMutedPriority ? 'text-fg-muted' : 'text-accent-fg/80')}>
                {isClosed
                  ? 'No further action is required. This record remains available to you.'
                  : isWaiting
                  ? 'Nothing is required from you right now.'
                  : isCompleted
                    ? 'Your completed record and resources remain available.'
                    : config.primaryAction
                      ? `${config.primaryAction.label}${config.dueText ? `, ${config.dueText}` : ''}`
                      : 'Check the latest milestone below.'}
              </p>
            </div>
          </div>
        </div>
      </article>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_314px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <article className="relative overflow-hidden rounded-2xl border border-border bg-[#F9FBFC] p-5 shadow-sm sm:p-6">
            <div className="pointer-events-none absolute right-0 top-0 hidden h-[116px] w-[370px] lg:block" aria-hidden>
              <Image src={journeyTopDecoration} alt="" fill className="object-contain object-right-top" sizes="370px" />
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-[72px] w-[260px] lg:hidden" aria-hidden>
              <Image src={journeyTopMobileDecoration} alt="" fill className="object-contain object-right-top" sizes="260px" />
            </div>
            <div className="relative z-[1]">
            <div>
              <p className="text-[13px] text-fg-muted">Application map</p>
              <h2 className="mt-1 text-[18px] font-semibold leading-6 text-fg">Your journey</h2>
            </div>

            <ol
              className={cn(
                'mt-6 grid grid-cols-1 gap-0',
                visibleJourneyStages.length === 2 && 'sm:grid-cols-2',
                visibleJourneyStages.length === 3 && 'sm:grid-cols-3',
                visibleJourneyStages.length === 4 && 'sm:grid-cols-4',
              )}
              aria-label="Applicant journey progress"
            >
              {visibleJourneyStages.map((stage, index) => {
                const done = config.completedStages.includes(stage.id);
                const current = config.journeyStage === stage.id;
                const terminal = config.terminalStage === stage.id;
                return (
                  <li key={stage.id} className="relative flex min-h-14 items-start gap-3 pb-4 sm:min-h-0 sm:flex-col sm:gap-2 sm:pb-0" aria-current={current ? 'step' : undefined}>
                    {index < visibleJourneyStages.length - 1 ? (
                      <span className={cn('absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-border sm:left-7 sm:right-0 sm:top-[13px] sm:h-px sm:w-auto', done && 'bg-accent')} aria-hidden />
                    ) : null}
                    <span className={cn('relative z-[1] inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium', done ? 'border-accent bg-accent text-accent-fg' : terminal ? 'border-danger bg-danger text-accent-fg' : current ? 'border-accent bg-surface text-accent' : 'border-border bg-bg text-fg-muted')} aria-hidden>
                      {done ? <Check className="size-4" strokeWidth={2} /> : terminal ? <X className="size-4" strokeWidth={2} /> : index + 1}
                    </span>
                    <span>
                      <span className={cn('block text-[11px] leading-4', done || current || terminal ? 'font-semibold text-fg' : 'text-fg-muted')}>
                        {terminal ? config.terminalLabel : stage.label}
                      </span>
                      {current && config.journeyStageHint ? (
                        <span className="mt-0.5 block text-[10px] font-normal leading-4 text-fg-muted">
                          {config.journeyStageHint}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-7 border-t border-border pt-6">
              <h3 className="text-[16px] font-semibold leading-6 text-fg">{config.journeyTitle}</h3>
              {config.postInternshipItems ? (
                <PostInternshipRows items={config.postInternshipItems} />
              ) : (
                <ol className="mt-4 grid gap-3 md:grid-cols-2">
                  {config.journeyItems.map((item, index) => (
                    <li key={item} className="flex items-center gap-3 rounded-lg px-4 py-3">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[12px] font-medium text-fg">{index + 1}</span>
                      <span className="text-[13px] leading-5 text-fg">{item}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            </div>
          </article>

          <article className="relative min-h-[250px] overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="pointer-events-none absolute bottom-0 right-4 hidden h-[210px] w-[200px] sm:block" aria-hidden>
              <Image src={activityIllustration} alt="" fill className="object-contain object-right-bottom" sizes="200px" />
            </div>
            <div className="relative z-[1] sm:max-w-[calc(100%-210px)]">
            <p className="text-[13px] text-fg-muted">Latest activity</p>
            <h2 className="mt-1 text-[18px] font-semibold leading-6 text-fg">{activityHeading}</h2>
            <ol className="mt-5 divide-y divide-border">
              {config.activity.map((item, index) => (
                <li key={`${item.title}-${item.date}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-muted text-accent" aria-hidden>
                    {index === 0 ? (isClosed ? <X className="size-4" /> : <CheckCircle2 className="size-4" />) : <Circle className="size-3" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                    <p className="text-[13px] font-medium leading-5 text-fg">{item.title}</p>
                    <p className="shrink-0 text-[12px] leading-5 text-fg-muted">{item.date}</p>
                  </div>
                </li>
              ))}
            </ol>
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <aside className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="task-guide-title">
            <p className="text-[13px] text-fg-muted">Task guide</p>
            <h2 id="task-guide-title" className="mt-1 text-[18px] font-semibold leading-6 text-fg">{config.guideTitle}</h2>
            <ul className="mt-5 space-y-3">
              {config.guideItems.map((item) => (
                <li key={item} className="flex gap-3 text-[13px] leading-5 text-fg">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {config.guideActionLabel ? (
              <OutOfScopeTooltip><Button variant="outline" className="mt-6 w-full">{config.guideActionLabel}</Button></OutOfScopeTooltip>
            ) : null}
          </aside>

          <aside className="relative min-h-[423px] overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="archetype-title">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Image src={archetypeImage} alt="" fill className="object-contain object-bottom lg:object-cover" sizes="(min-width: 1024px) 314px, 100vw" />
            </div>
            <div className="relative z-[1]">
              <p className="text-[12px] leading-5 text-fg-muted">Your Defender Archetype</p>
              <h2 id="archetype-title" className="mt-1 text-[24px] font-semibold leading-8 text-accent">The Sentinel</h2>
              <p className="mt-2 max-w-[220px] text-[13px] leading-5 text-fg-muted">You protect what matters with intelligence and precision.</p>
            </div>
            <OutOfScopeTooltip><Button className="absolute bottom-6 left-5 z-[1] sm:left-6" size="sm">Play Quiz Again</Button></OutOfScopeTooltip>
          </aside>
        </div>
      </div>
    </section>
  );
}

function SubmittedApplicationDashboard({
  config,
  archetypeImage,
  statusIllustration,
  activityIllustration,
  journeyTopDecoration,
}: {
  config: ApplicantDashboardStateConfig;
  archetypeImage: string;
  statusIllustration: string;
  activityIllustration: string;
  journeyTopDecoration: string;
}) {
  const router = useRouter();
  const nextSteps = [
    { label: 'Application review', image: '/images/programme-undergraduate-icon.svg' },
    { label: 'Potential interview', image: '/images/programme-scientists-icon.svg' },
    { label: 'Status updates', image: '/images/programme-cyber-icon.svg' },
  ];

  return (
    <section className="relative mx-auto w-full max-w-[1440px] px-4 pb-8 md:px-6" aria-label={`${config.badge} dashboard content`}>
      <article className="relative overflow-hidden rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[302px_minmax(0,1fr)] md:gap-10">
          <div className="relative min-h-[298px] overflow-hidden rounded-lg bg-accent text-accent-fg">
            <Image src="/images/applicant-dashboard-priority-banner.png" alt="" fill className="object-cover" sizes="302px" priority />
            <div className="relative z-[1] max-w-[178px] p-6">
              <p className="text-[24px] font-semibold leading-[29px] tracking-[-0.48px]">You’re all<br />caught up</p>
              <p className="mt-4 text-[14px] leading-[20px] text-accent-fg/80">Nothing is required from you right now.</p>
            </div>
          </div>

          <div className="relative min-w-0 py-1 md:min-h-[298px]">
            <div className="pointer-events-none absolute bottom-[-10px] right-0 hidden h-[250px] w-[354px] md:block" aria-hidden>
              <Image src={statusIllustration} alt="" fill className="object-contain object-right-bottom" sizes="354px" />
            </div>
            <div className="relative z-[1] max-w-[600px]">
              <p className="text-[14px] leading-5 text-fg-muted">Primary spotlight</p>
              <h2 className="mt-4 text-[24px] font-semibold leading-[29px] tracking-[-0.48px] text-fg">Resume your application</h2>
              <p className="mt-1 text-[14px] leading-6 text-fg-muted">Complete the remaining sections and review everything before you submit.</p>

              <dl className="mt-8 grid max-w-[600px] grid-cols-2 gap-x-4 gap-y-4">
                {config.metadata.map((item, index) => (
                  <div key={`${item.label}-${item.value}`} className={cn('min-w-0', index === 1 && 'border-l border-border pl-4')}>
                    <dt className="text-[14px] leading-5 text-fg-muted">{item.label}</dt>
                    <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">{item.value}</dd>
                  </div>
                ))}
              </dl>

              {config.secondaryAction?.route ? (
                <Button variant="outline" className="mt-7" onClick={() => router.push(config.secondaryAction!.route!)}>
                  {config.secondaryAction.label}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_314px] md:items-start">
        <div className="min-w-0 space-y-5">
          <article className="relative min-h-[442px] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 h-[116px] w-[370px]" aria-hidden>
              <Image src={journeyTopDecoration} alt="" fill className="object-contain object-right-top" sizes="370px" />
            </div>
            <header className="relative z-[1] px-6 pb-4 pt-6">
              <p className="text-[14px] leading-5 text-fg-muted">Application map</p>
              <h2 className="mt-1.5 text-[18px] font-semibold leading-[18px] text-fg">Your journey</h2>
            </header>

            <div className="relative z-[1] grid gap-6 px-6 pb-6 pt-3 md:grid-cols-[143px_minmax(0,1fr)] md:gap-10">
              <ol className="flex flex-col" aria-label="Applicant journey progress">
                {journeyStages.map((stage, index) => (
                  <li key={stage.id} className="relative flex min-h-[74px] items-start gap-2 last:min-h-0" aria-current={index === 0 ? 'step' : undefined}>
                    {index < journeyStages.length - 1 ? <span className="absolute left-[11.5px] top-7 h-[46px] w-px bg-border" aria-hidden /> : null}
                    <span className={cn('relative z-[1] inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px]', index === 0 ? 'border-success bg-success text-accent-fg' : 'border-border bg-bg text-fg-muted')}>
                      {index === 0 ? <Check className="size-4" strokeWidth={2} aria-hidden /> : index + 1}
                    </span>
                    <span className={cn('pt-0.5 text-[11px] leading-4', index === 0 ? 'font-medium text-fg' : 'text-fg-muted')}>{stage.label}</span>
                  </li>
                ))}
              </ol>

              <div className="rounded-lg border border-border bg-surface p-6">
                <h3 className="text-[18px] font-medium leading-[18px] tracking-[-0.45px] text-fg">What happens next</h3>
                <ol className="mt-6 grid gap-4 sm:grid-cols-2">
                  {nextSteps.map((step, index) => (
                    <li key={step.label} className="relative flex min-h-[72px] items-center rounded-md border border-border bg-surface px-4 py-3 pr-[76px]">
                      <span className="text-[14px] font-medium leading-5 text-fg">{index + 1}. {step.label}</span>
                      <span className="absolute right-4 top-1/2 size-14 -translate-y-1/2 overflow-hidden" aria-hidden>
                        <Image src={step.image} alt="" fill className="object-contain" sizes="56px" />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </article>

          <article className="relative min-h-[214px] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="pointer-events-none absolute bottom-0 right-[34px] hidden h-[169px] w-[171px] sm:block" aria-hidden>
              <Image src={activityIllustration} alt="" fill className="object-cover object-right-bottom" sizes="171px" />
            </div>
            <header className="relative z-[1] px-6 pb-4 pt-6">
              <p className="text-[14px] leading-5 text-fg-muted">Latest activity</p>
              <h2 className="mt-1.5 text-[18px] font-semibold leading-[18px] text-fg">Recent application activity</h2>
            </header>
            <ol className="relative z-[1] max-w-[676px] space-y-8 px-6 py-5">
              {config.activity.map((item, index) => (
                <li key={`${item.title}-${item.date}`} className="relative flex items-start gap-4 pl-5">
                  {index < config.activity.length - 1 ? <span className="absolute left-[6px] top-3 h-10 w-px bg-border" aria-hidden /> : null}
                  <span className="absolute left-0 top-1 size-3.5 rounded-full bg-accent" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-[14px] font-medium leading-5 text-fg">{item.title}</p>
                    <p className="inline-flex shrink-0 items-center gap-2 text-[12px] leading-4 text-fg"><Clock3 className="size-4" strokeWidth={1.5} aria-hidden />{item.date}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <div className="space-y-5">
          <aside className="rounded-lg border border-border bg-surface p-6 shadow-sm" aria-labelledby="submitted-guide-title">
            <p className="text-[14px] leading-5 text-fg-muted">Task guide</p>
            <h2 id="submitted-guide-title" className="mt-1.5 text-[18px] font-medium leading-[23px] text-fg">What to expect after<br className="hidden md:block" /> submission</h2>
            <ul className="mt-6 space-y-3">
              {config.guideItems.map((item) => (
                <li key={item} className="flex gap-3 text-[13px] leading-5 text-fg">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {config.guideActionLabel ? <OutOfScopeTooltip><Button variant="outline" className="mt-6">{config.guideActionLabel}</Button></OutOfScopeTooltip> : null}
          </aside>

          <aside className="relative h-[389px] overflow-hidden rounded-lg border border-border bg-surface p-6 shadow-sm" aria-labelledby="submitted-archetype-title">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Image src={archetypeImage} alt="" fill className="object-cover object-bottom" sizes="314px" />
            </div>
            <div className="relative z-[1]">
              <p className="text-[14px] leading-6 text-fg-muted">Your defender archetype</p>
              <h2 id="submitted-archetype-title" className="mt-0.5 text-[24px] font-semibold leading-8 text-warning">The Sentinel</h2>
              <p className="mt-1 max-w-[235px] text-[14px] leading-5 text-fg">You protect what matters with intelligence and precision.</p>
            </div>
            <OutOfScopeTooltip><Button className="absolute bottom-6 left-6 z-[1]" size="sm">Play Quiz Again</Button></OutOfScopeTooltip>
          </aside>
        </div>
      </div>
    </section>
  );
}

function DraftApplicationDashboard({
  config,
  archetypeImage,
  statusIllustration,
  activityIllustration,
  journeyTopDecoration,
  onPrimaryAction,
}: {
  config: ApplicantDashboardStateConfig;
  archetypeImage: string;
  statusIllustration: string;
  activityIllustration: string;
  journeyTopDecoration: string;
  onPrimaryAction: () => void;
}) {
  const router = useRouter();
  const draftTasks = [
    { label: 'Complete personal details', image: '/images/programme-scientists-icon.svg' },
    { label: 'Add education details', image: '/images/contact-details.jpg' },
    { label: 'Upload supporting documents', image: '/images/programme-cyber-icon.svg' },
    { label: 'Review and submit', image: '/images/additional-information.jpg' },
  ];

  return (
    <section className="relative mx-auto w-full max-w-[1440px] px-4 pb-8 md:px-6" aria-label={`${config.badge} dashboard content`}>
      <article className="relative overflow-hidden rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)] md:gap-10">
          <div className="relative min-h-[300px] overflow-hidden rounded-lg bg-accent text-accent-fg">
            <Image
              src="/images/applicant-dashboard-priority-banner.png"
              alt=""
              fill
              className="object-cover"
              sizes="300px"
              priority
            />
            <div className="relative z-[1] max-w-[160px] p-6">
              <p className="text-[24px] font-semibold leading-[29px] tracking-[-0.48px]">Your next priority</p>
              <p className="mt-4 text-[14px] leading-[22px] text-accent-fg/85">
                Resume Application,<br />Applications<br />close 30 Sep 2026
              </p>
            </div>
          </div>

          <div className="relative min-w-0 py-1 md:min-h-[300px]">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[354px] md:block" aria-hidden>
              <Image src={statusIllustration} alt="" fill className="object-contain object-right-bottom" sizes="354px" />
            </div>
            <div className="relative z-[1] max-w-[600px]">
              <p className="text-[14px] leading-5 text-fg-muted">Primary spotlight</p>
              <h2 className="mt-4 text-[24px] font-semibold leading-[29px] tracking-[-0.48px] text-fg">{config.spotlightTitle}</h2>
              <p className="mt-1 text-[14px] leading-6 text-fg-muted">{config.spotlightCopy}</p>

              <dl className="mt-8 grid max-w-[600px] grid-cols-2 gap-x-4 gap-y-4">
                {config.metadata.map((item, index) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className={cn('min-w-0', index === 1 && 'border-l border-border pl-4')}
                  >
                    <dt className="text-[14px] leading-5 text-fg-muted">{item.label}</dt>
                    <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">{item.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7 flex flex-wrap gap-2">
                <Button onClick={onPrimaryAction}>{config.primaryAction?.label}</Button>
                {config.secondaryAction?.route ? (
                  <Button variant="outline" onClick={() => router.push(config.secondaryAction!.route!)}>
                    {config.secondaryAction.label}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_314px] md:items-start">
        <div className="min-w-0 space-y-5">
          <article className="relative min-h-[442px] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 h-[116px] w-[370px]" aria-hidden>
              <Image src={journeyTopDecoration} alt="" fill className="object-contain object-right-top" sizes="370px" />
            </div>
            <header className="relative z-[1] px-6 pb-4 pt-6">
              <p className="text-[14px] leading-5 text-fg-muted">Application map</p>
              <h2 className="mt-1.5 text-[18px] font-semibold leading-[18px] text-fg">Your journey</h2>
            </header>

            <div className="relative z-[1] grid gap-6 px-6 pb-6 pt-3 md:grid-cols-[143px_minmax(0,1fr)] md:gap-10">
              <ol className="flex flex-col" aria-label="Applicant journey progress">
                {journeyStages.map((stage, index) => (
                  <li key={stage.id} className="relative flex min-h-[74px] items-start gap-2 last:min-h-0" aria-current={index === 0 ? 'step' : undefined}>
                    {index < journeyStages.length - 1 ? (
                      <span className="absolute left-[11.5px] top-7 h-[46px] w-px bg-border" aria-hidden />
                    ) : null}
                    <span className="relative z-[1] inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-[12px] text-fg-muted">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">
                      <span className="block text-[11px] leading-4 text-fg-muted">{stage.label}</span>
                      {index === 0 ? <span className="mt-0.5 block text-[10px] leading-4 text-fg-muted">Draft · Not submitted</span> : null}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="rounded-lg border border-border bg-surface p-6">
                <h3 className="text-[18px] font-medium leading-[18px] tracking-[-0.45px] text-fg">Complete your application</h3>
                <ol className="mt-6 grid gap-4 sm:grid-cols-2">
                  {draftTasks.map((task, index) => (
                    <li key={task.label} className="relative flex min-h-[72px] items-center rounded-md border border-border bg-surface px-4 py-3 pr-[76px]">
                      <span className="text-[14px] font-medium leading-5 text-fg">{index + 1}. {task.label}</span>
                      <span className="absolute right-4 top-1/2 size-14 -translate-y-1/2 overflow-hidden" aria-hidden>
                        <Image src={task.image} alt="" fill className="object-contain" sizes="56px" />
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </article>

          <article className="relative min-h-[214px] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="pointer-events-none absolute bottom-0 right-[34px] hidden h-[169px] w-[171px] sm:block" aria-hidden>
              <Image src={activityIllustration} alt="" fill className="object-cover object-right-bottom" sizes="171px" />
            </div>
            <header className="relative z-[1] px-6 pb-4 pt-6">
              <p className="text-[14px] leading-5 text-fg-muted">Latest activity</p>
              <h2 className="mt-1.5 text-[18px] font-semibold leading-[18px] text-fg">Updates from your journey</h2>
            </header>
            <ol className="relative z-[1] max-w-[676px] space-y-8 px-6 py-5">
              {config.activity.map((item, index) => (
                <li key={`${item.title}-${item.date}`} className="relative flex items-start gap-4 pl-5">
                  {index < config.activity.length - 1 ? <span className="absolute left-[6px] top-3 h-10 w-px bg-border" aria-hidden /> : null}
                  <span className="absolute left-0 top-1 size-3.5 rounded-full bg-accent" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-[14px] font-medium leading-5 text-fg">{item.title}</p>
                    <p className="inline-flex shrink-0 items-center gap-2 text-[12px] leading-4 text-fg">
                      <Clock3 className="size-4" strokeWidth={1.5} aria-hidden />{item.date}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <div className="space-y-5">
          <aside className="rounded-lg border border-border bg-surface p-6 shadow-sm" aria-labelledby="draft-guide-title">
            <p className="text-[14px] leading-5 text-fg-muted">Task guide</p>
            <h2 id="draft-guide-title" className="mt-1.5 text-[18px] font-semibold leading-[18px] text-fg">{config.guideTitle}</h2>
            <ul className="mt-6 space-y-3">
              {config.guideItems.map((item) => (
                <li key={item} className="flex gap-3 text-[13px] leading-5 text-fg">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.5} aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {config.guideActionLabel ? (
              <OutOfScopeTooltip><Button variant="outline" className="mt-6">{config.guideActionLabel}</Button></OutOfScopeTooltip>
            ) : null}
          </aside>

          <aside className="relative h-[389px] overflow-hidden rounded-lg border border-border bg-surface p-6 shadow-sm" aria-labelledby="draft-archetype-title">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Image src={archetypeImage} alt="" fill className="object-cover object-bottom" sizes="314px" />
            </div>
            <div className="relative z-[1]">
              <p className="text-[14px] leading-6 text-fg-muted">Your defender archetype</p>
              <h2 id="draft-archetype-title" className="mt-0.5 text-[24px] font-semibold leading-8 text-warning">The Sentinel</h2>
              <p className="mt-1 max-w-[235px] text-[14px] leading-5 text-fg">You protect what matters with intelligence and precision.</p>
            </div>
            <OutOfScopeTooltip><Button className="absolute bottom-6 left-6 z-[1]" size="sm">Play Quiz Again</Button></OutOfScopeTooltip>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PostInternshipRows({ items }: { items: readonly ApplicantDashboardPostInternshipItem[] }) {
  const router = useRouter();
  return (
    <div className="mt-4 divide-y divide-border rounded-xl border border-border">
      {items.map((item) => (
        <div key={item.title} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14px] font-medium leading-5 text-fg">{item.title}</p>
            <p className="mt-1 text-[12px] leading-4 text-fg-muted">{item.status}{item.optional ? ', optional' : ''}</p>
          </div>
          {item.route ? (
            <Button variant="ghost" size="sm" onClick={() => router.push(item.route!)}>
              {item.action}<ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
