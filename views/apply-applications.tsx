'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { ApplicantEmptyState } from '@/components/ui-legacy/applicant-empty-state';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui-legacy/dialog';
import { ApplicationStageIllustration } from '@/components/ui-legacy/application-stage-illustration';
import stageExamples from '@/data/applicant-application-stage-examples.json';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadApplicantApplications } from '@/lib/applicant-applications';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import type { ApplicantApplicationCardAction, ApplicantScenarioApplicationRecord, ApplicantApplicationStageExample, ApplicantCardStage, ApplicantHomeScenario } from '@/lib/types';
import { formatStatusLabel } from '@/lib/status-label';
import { cn } from '@/lib/utils';

type ApplicationTab = ApplicantScenarioApplicationRecord['tabGroup'];

const FILTERS: Array<{ value: ApplicationTab; label: string }> = [
  { value: 'in-progress', label: 'In progress' },
  { value: 'closed', label: 'Completed' },
];

const EXAMPLES = stageExamples as ApplicantApplicationStageExample[];

function illustrationStage(record: ApplicantScenarioApplicationRecord, scenario: ApplicantHomeScenario): ApplicantCardStage {
  if (record.statusBadge === 'OFFER RECEIVED' || record.statusBadge === 'OFFER ACCEPTED') return 'offer';
  if (record.tabGroup === 'closed') return 'closed';
  if (record.statusBadge === 'DRAFT') return 'draft';
  if (record.statusBadge === 'SUBMITTED') return 'submitted';
  if (record.statusBadge === 'INTERVIEW') {
    if (record.focal && scenario === 'interview-pending-confirmation') return 'interview-pending';
    if (record.focal && scenario === 'interview-scheduled') return 'interview-confirmed';
    return 'interview-action';
  }
  return 'review';
}

function statusVariant(status: string) {
  if (status === 'OFFER ACCEPTED') return 'success' as const;
  if (status === 'OFFER RECEIVED' || status === 'INTERVIEW') return 'warning' as const;
  if (status === 'UNDER REVIEW' || status === 'SUBMITTED') return 'info' as const;
  if (status === 'OFFER DECLINED' || status === 'OFFER EXPIRED' || status === 'UNSUCCESSFUL') return 'danger' as const;
  return 'subtle' as const;
}

function routeRecordId(applicationId: string) {
  return loadApplicantApplications().find((record) => record.applicationId === applicationId)?.id ?? 'app-ui-2027';
}

function ApplicationCard({ record, stage, example, onPreview }: { record: ApplicantScenarioApplicationRecord; stage: ApplicantCardStage; example?: ApplicantApplicationStageExample; onPreview: (record: ApplicantApplicationStageExample) => void }) {
  const router = useRouter();
  const detailId = routeRecordId(record.applicationId);
  const needsAction = ['continue-application', 'choose-timeslot', 'review-offer', 'complete-onboarding'].includes(record.primaryAction);
  const destinations: Record<ApplicantApplicationCardAction, string> = {
    'continue-application': '/apply/review',
    'choose-timeslot': `/apply/applicant-interview-review?applicationId=${detailId}`,
    'view-interview': '/apply/interviews',
    'review-offer': `/apply/applicant-offer-detail?applicationId=${detailId}`,
    'complete-onboarding': '/apply/onboarding',
    'view-internship': '/apply/internship',
    'view-application': `/apply/applications/${detailId}`,
  };
  const linkClass = 'inline-flex min-h-8 items-center gap-1.5 text-[13px] font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent';
  const isClosed = record.tabGroup === 'closed';

  function runAction(label: string) {
    if (example) return onPreview(example);
    const action = label.toLowerCase();
    if (action.includes('continue application')) return router.push('/apply/review');
    if (action.includes('choose a timeslot')) return router.push('/apply/interviews?presentation=tabs');
    if (action.includes('interview')) return router.push('/apply/interviews');
    if (action.includes('offer')) return router.push(`/apply/applicant-offer-detail?applicationId=${detailId}`);
    if (action.includes('onboarding')) return router.push('/apply/onboarding');
    if (action.includes('internship')) return router.push('/apply/internship');
    return router.push(`/apply/applications/${detailId}`);
  }

  return (
    <Card
      className={cn(
        'flex min-h-[283px] flex-col p-6 shadow-none transition-colors hover:border-border-strong',
        isClosed && 'text-fg-muted',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold leading-6 text-fg"><button className="text-left hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" onClick={() => example ? onPreview(example) : router.push(`/apply/applications/${detailId}`)}>{record.programme}</button></h2>
          <p className="mt-1 text-[14px] leading-5 text-fg-muted">{record.applicationId}</p>
        </div>
        <Badge variant={stage === 'incomplete' ? 'warning' : stage === 'interview-confirmed' ? 'success' : statusVariant(record.statusBadge)} className="max-w-[46%] shrink-0 text-right">
          {example?.stageLabel ?? (stage === 'interview-pending' ? 'Interview · Pending confirmation' : stage === 'interview-confirmed' ? 'Interview · Confirmed' : formatStatusLabel(record.statusBadge))}
        </Badge>
      </div>

      <div className="my-5 flex min-h-[112px] items-center gap-4">
        <p className="min-w-0 flex-1 text-[14px] leading-5 text-fg-muted">{record.cardMessage}</p>
        <ApplicationStageIllustration stage={stage} className="w-[112px] max-sm:w-[88px]" />
      </div>
      <div className="mt-auto border-t border-border pt-4">
      {record.actionDeadline ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
          <CalendarDays className="size-4" aria-hidden />
          {record.statusBadge === 'DRAFT' ? 'Submit by' : 'Action by'} {record.actionDeadline}
        </p>
      ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {needsAction ? (
            <Button size="sm" className="h-auto min-h-8 whitespace-normal py-1.5 text-left" onClick={() => router.push(destinations[record.primaryAction])}>
              {record.primaryCta}
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Button>
          ) : (
            <Link className={linkClass} href={destinations[record.primaryAction]}>
              {record.primaryCta}<ArrowRight className="size-3.5 shrink-0" aria-hidden />
            </Link>
          )}
          {record.secondaryCta && record.secondaryAction && record.secondaryAction !== record.primaryAction ? (
            <Link className={linkClass} href={destinations[record.secondaryAction]}>
              {record.secondaryCta}<ArrowRight className="size-3.5 shrink-0" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function ApplyApplications() {
  const { applications, homeScenario } = useApplicantScenarioData();
  const [filter, setFilter] = useState<ApplicationTab>('in-progress');
  const [showExamples, setShowExamples] = useState(false);
  const [preview, setPreview] = useState<ApplicantApplicationStageExample | null>(null);
  useEffect(() => {
    setShowExamples(new URLSearchParams(window.location.search).get('examples') === 'stages');
  }, []);
  const records = showExamples ? EXAMPLES : applications;
  const defaultTab = records.find((record) => record.focal)?.tabGroup ?? 'in-progress';
  const effectiveFilter = filter === 'in-progress' && !showExamples ? defaultTab : filter;

  function toggleExamples(checked: boolean) {
    setShowExamples(checked);
    setFilter('in-progress');
    const url = new URL(window.location.href);
    if (checked) url.searchParams.set('examples', 'stages');
    else url.searchParams.delete('examples');
    window.history.replaceState(null, '', url);
  }

  const counts = useMemo(
    () => ({
      'in-progress': records.filter((record) => record.tabGroup === 'in-progress').length,
      closed: records.filter((record) => record.tabGroup === 'closed').length,
    }),
    [records],
  );

  const visibleRecords = useMemo(
    () => records.filter((record) => record.tabGroup === effectiveFilter),
    [effectiveFilter, records],
  );

  return (
    <Shell activeRoute="/apply/applications" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg">
        <header className="relative overflow-hidden px-[clamp(24px,2.6vw,40px)] pt-6">
          <div className="relative z-[1] mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-fg">My Applications</h1>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-muted">Stage examples<Switch aria-label="Show stage examples" checked={showExamples} onCheckedChange={toggleExamples} /></label>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          {showExamples && <p className="mb-5 rounded-md border border-border bg-bg-muted px-4 py-3 text-sm text-fg-muted">Sample data · Each card demonstrates a different application stage. Open a card to preview its details. Your application records are unchanged.</p>}
          <Tabs value={effectiveFilter} onValueChange={(value) => setFilter(value as ApplicationTab)}>
            <TabsList className="h-auto max-w-full justify-start overflow-x-auto bg-transparent p-0">
              {FILTERS.map((item) => (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-9 rounded-md px-4 data-[active]:border data-[active]:border-border data-[active]:bg-surface"
                >
                  {item.label} ({counts[item.value]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {visibleRecords.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {visibleRecords.map((record) => (
                <ApplicationCard key={record.applicationId} record={record} stage={showExamples ? (record as ApplicantApplicationStageExample).stage : illustrationStage(record, homeScenario)} example={showExamples ? record as ApplicantApplicationStageExample : undefined} onPreview={setPreview} />
              ))}
            </div>
          ) : (
            <ApplicantEmptyState type="applications" className="mt-6" title={records.length ? `No ${filter === 'closed' ? 'closed' : 'in-progress'} applications` : undefined} description={records.length ? 'Applications will appear here when their status changes.' : undefined} />
          )}
        </div>
      </div>
      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
        <DialogTitle className="pr-6">{preview?.previewTitle ?? 'Application preview'}</DialogTitle>
        <DialogDescription>Sample application preview — no submission or booking will be made.</DialogDescription>
        {preview && <div className="space-y-5">
          <div className="flex items-center gap-4"><ApplicationStageIllustration stage={preview.stage} className="w-24" /><div className="min-w-0"><p className="text-base font-semibold">{preview.programme}</p><p className="mt-1 text-xs text-fg-muted">{preview.applicationId}</p><Badge className="mt-2" variant={statusVariant(preview.statusBadge)}>{preview.stageLabel}</Badge></div></div>
          <p className="text-sm leading-6 text-fg-muted">{preview.cardMessage}</p>
          <dl className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">{preview.details.map(detail => <div key={detail.label}><dt className="text-xs text-fg-muted">{detail.label}</dt><dd className="mt-1 text-sm leading-5">{detail.value}</dd></div>)}</dl>
          <div><h3 className="text-sm font-semibold">What happens next</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-5 text-fg-muted">{preview.nextSteps.map(step => <li key={step}>{step}</li>)}</ol></div>
          <div className="flex justify-end"><Button onClick={() => setPreview(null)}>Close preview</Button></div>
        </div>}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
