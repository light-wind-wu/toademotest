'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, FileText } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadApplicantApplications } from '@/lib/applicant-applications';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import type { ApplicantScenarioApplicationRecord } from '@/lib/types';
import { formatStatusLabel } from '@/lib/status-label';
import { cn } from '@/lib/utils';

type ApplicationTab = ApplicantScenarioApplicationRecord['tabGroup'];

const FILTERS: Array<{ value: ApplicationTab; label: string }> = [
  { value: 'in-progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
];

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

function ApplicationCard({ record }: { record: ApplicantScenarioApplicationRecord }) {
  const router = useRouter();
  const isClosed = record.tabGroup === 'closed';
  const detailId = routeRecordId(record.applicationId);

  function runAction(label: string) {
    const action = label.toLowerCase();
    if (action.includes('continue application')) return router.push('/apply/review');
    if (action.includes('choose a timeslot')) return router.push(`/apply/applicant-interview-review?applicationId=${detailId}`);
    if (action.includes('interview')) return router.push('/apply/interviews');
    if (action.includes('offer')) return router.push(`/apply/applicant-offer-detail?applicationId=${detailId}`);
    if (action.includes('onboarding')) return router.push('/apply/onboarding');
    if (action.includes('internship')) return router.push('/apply/internship');
    return router.push(`/apply/applications/${detailId}`);
  }

  return (
    <Card
      className={cn(
        'flex min-h-[260px] flex-col p-6 shadow-none transition-colors hover:border-border-strong',
        isClosed && 'bg-bg-subtle text-fg-muted opacity-75',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold leading-6 text-fg">{record.programme}</h2>
          <p className="mt-1 text-[14px] leading-5 text-fg-muted">{record.applicationId}</p>
        </div>
        <Badge variant={statusVariant(record.statusBadge)} className="shrink-0 whitespace-nowrap">
          {formatStatusLabel(record.statusBadge)}
        </Badge>
      </div>

      <p className="mt-7 text-[14px] leading-5 text-fg">{record.cardMessage}</p>
      {record.actionDeadline ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-warning">
          <CalendarDays className="size-4" aria-hidden />
          Action by {record.actionDeadline}
        </p>
      ) : null}

      <div className="mt-auto border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] leading-4 text-fg-muted">
          <span>{record.focal ? 'Current application' : 'Application history'}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => runAction(record.primaryCta)}>
            {record.primaryCta}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          {record.secondaryCta ? (
            <Button variant="outline" size="sm" onClick={() => runAction(record.secondaryCta!)}>
              {record.secondaryCta}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function ApplyApplications() {
  const { applications: records } = useApplicantScenarioData();
  const [filter, setFilter] = useState<ApplicationTab>('in-progress');

  const counts = useMemo(
    () => ({
      'in-progress': records.filter((record) => record.tabGroup === 'in-progress').length,
      closed: records.filter((record) => record.tabGroup === 'closed').length,
    }),
    [records],
  );

  const visibleRecords = useMemo(
    () => records.filter((record) => record.tabGroup === filter),
    [filter, records],
  );

  return (
    <Shell activeRoute="/apply/applications" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="relative overflow-hidden bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="relative z-[1] mx-auto w-full max-w-[1440px]">
            <h1 className="text-[38px] font-semibold leading-[44px] tracking-[-0.8px] text-fg">My Applications</h1>
            <p className="mt-2 max-w-xl text-[16px] leading-6 text-fg-muted">
              Track your applications and complete any required next steps.
            </p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as ApplicationTab)}>
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
                <ApplicationCard key={record.applicationId} record={record} />
              ))}
            </div>
          ) : (
            <Card className="mt-6 flex min-h-[360px] flex-col items-center justify-center p-8 text-center shadow-none">
              <div className="relative h-[150px] w-full max-w-[340px]" aria-hidden>
                <Image src="/images/application-overview-empty.png" alt="" fill className="object-contain" sizes="340px" />
              </div>
              <FileText className="mt-2 size-5 text-fg-muted" aria-hidden />
              <h2 className="mt-3 text-[18px] font-semibold text-fg">No applications in this view</h2>
              <p className="mt-1 text-[14px] text-fg-muted">Applications will appear here when their status changes.</p>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}
