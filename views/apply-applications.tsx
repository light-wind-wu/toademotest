'use client';

import Image from 'next/image';
import Link from 'next/link';
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
import type { ApplicantApplicationCardAction, ApplicantScenarioApplicationRecord } from '@/lib/types';
import { formatStatusLabel } from '@/lib/status-label';

type ApplicationTab = ApplicantScenarioApplicationRecord['tabGroup'];

const FILTERS: Array<{ value: ApplicationTab; label: string }> = [
  { value: 'in-progress', label: 'In progress' },
  { value: 'closed', label: 'Completed' },
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

  return (
    <Card className="flex min-w-0 flex-col p-6 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="break-words text-[18px] font-semibold leading-6 text-fg">{record.programme}</h2>
          <p className="mt-1 text-[14px] leading-5 text-fg-muted">{record.applicationId}</p>
        </div>
        <Badge variant={statusVariant(record.statusBadge)} className="shrink-0 whitespace-nowrap">
          {formatStatusLabel(record.statusBadge)}
        </Badge>
      </div>

      <p className="mt-5 text-[14px] leading-6 text-fg">{record.cardMessage}</p>
      <div className="mt-auto pt-5">
        {record.actionDeadline && needsAction ? (
          <p className="mb-3 flex items-start gap-1.5 text-[13px] font-medium leading-5 text-fg-muted">
            <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{record.deadlineLabel} {record.actionDeadline}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
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
  const { applications: records, homeScenario } = useApplicantScenarioData();
  const [selection, setSelection] = useState<{ scenario: string; tab: ApplicationTab } | null>(null);
  const defaultTab = records.find((record) => record.focal)?.tabGroup ?? 'in-progress';
  const filter = selection?.scenario === homeScenario ? selection.tab : defaultTab;

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
          <Tabs value={filter} onValueChange={(value) => setSelection({ scenario: homeScenario, tab: value as ApplicationTab })}>
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
