'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, FileText } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadApplicantApplications } from '@/lib/applicant-applications';
import type {
  ApplicantApplicationFilter,
  ApplicantApplicationRecord,
  CandidateApplicationStatus,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ value: ApplicantApplicationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'needs-action', label: 'Needs action' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
];

function statusVariant(status: CandidateApplicationStatus) {
  if (status === 'OFFER ACCEPTED') return 'success' as const;
  if (status === 'OFFER RECEIVED' || status === 'INTERVIEW') return 'warning' as const;
  if (status === 'UNDER REVIEW' || status === 'SUBMITTED') return 'info' as const;
  return 'subtle' as const;
}

function actionLabel(action: ApplicantApplicationRecord['primaryAction']) {
  if (action === 'resume') return 'Resume application';
  if (action === 'confirm-interview') return 'Confirm interview';
  if (action === 'confirm-slot') return 'Confirm new slot';
  if (action === 'manage-interview') return 'View / Manage Interview';
  if (action === 'await-interview-confirmation') return 'Await Interview Time Confirmation';
  if (action === 'view-offer') return 'View offer';
  if (action === 'view-outcome') return 'View outcome';
  return null;
}

function ApplicationCard({ record }: { record: ApplicantApplicationRecord }) {
  const router = useRouter();
  const isClosed = record.filter === 'closed';
  const action = actionLabel(record.primaryAction);

  function runPrimaryAction() {
    if (
      record.primaryAction === 'confirm-interview' ||
      record.primaryAction === 'confirm-slot'
    ) {
      router.push(`/apply/applicant-interview-review?applicationId=${record.id}`);
      return;
    }
    if (
      record.primaryAction === 'manage-interview' ||
      record.primaryAction === 'await-interview-confirmation'
    ) {
      router.push(`/apply/applications/${record.id}`);
      return;
    }
    if (record.primaryAction === 'view-offer') {
      router.push(`/apply/applicant-offer-detail?applicationId=${record.id}`);
      return;
    }
    router.push(`/apply/applications/${record.id}`);
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
          <h2 className="text-[18px] font-semibold leading-6 text-fg">{record.programmeName}</h2>
          <p className="mt-1 text-[14px] leading-5 text-fg-muted">{record.intake}</p>
        </div>
        <Badge variant={statusVariant(record.status)} className="shrink-0 whitespace-nowrap">
          {record.status}
        </Badge>
      </div>

      <p className="mt-7 text-[14px] leading-5 text-fg">{record.statusMessage}</p>
      {record.deadline ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-warning">
          <CalendarDays className="size-4" aria-hidden />
          {record.deadline}
        </p>
      ) : null}

      <div className="mt-auto border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] leading-4 text-fg-muted">
          <span>{record.applicationId}</span>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <span>Submitted {record.submittedAt}</span>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <span>Updated {record.updatedAt}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/apply/applications/${record.id}`)}>
            View application
          </Button>
          {action ? (
            <Button
              size="sm"
              variant={record.primaryAction === 'await-interview-confirmation' ? 'outline' : 'solid'}
              onClick={runPrimaryAction}
            >
              {action}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function ApplyApplications() {
  const [records, setRecords] = useState<ApplicantApplicationRecord[]>([]);
  const [filter, setFilter] = useState<ApplicantApplicationFilter>('all');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecords(loadApplicantApplications());
    setReady(true);
  }, []);

  const counts = useMemo(
    () => ({
      all: records.length,
      'needs-action': records.filter((record) => record.filter === 'needs-action').length,
      'in-progress': records.filter((record) => record.filter === 'in-progress').length,
      closed: records.filter((record) => record.filter === 'closed').length,
    }),
    [records],
  );

  const visibleRecords = useMemo(
    () => (filter === 'all' ? records : records.filter((record) => record.filter === filter)),
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
          <Tabs value={filter} onValueChange={(value) => setFilter(value as ApplicantApplicationFilter)}>
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

          {!ready ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Loading applications">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-[260px] animate-pulse rounded-lg border border-border bg-surface" />
              ))}
            </div>
          ) : visibleRecords.length > 0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {visibleRecords.map((record) => (
                <ApplicationCard key={record.id} record={record} />
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
