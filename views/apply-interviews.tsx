'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock3, Video } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { loadApplicantApplications } from '@/lib/applicant-applications';
import type { ApplicantApplicationRecord } from '@/lib/types';

function routeFor(record: ApplicantApplicationRecord) {
  if (record.primaryAction === 'confirm-interview' || record.primaryAction === 'confirm-slot') {
    return `/apply/applicant-interview-review?applicationId=${record.id}`;
  }
  if (record.primaryAction === 'await-interview-confirmation' && record.interviewDetails?.availabilityNote) {
    return `/apply/applicant-interview-confirmation?request=alternate&applicationId=${record.id}`;
  }
  return `/apply/applications/${record.id}`;
}

export default function ApplyInterviews() {
  const router = useRouter();
  const [records, setRecords] = useState<ApplicantApplicationRecord[]>([]);

  useEffect(() => {
    setRecords(loadApplicantApplications().filter((record) => record.status === 'INTERVIEW'));
  }, []);

  return (
    <Shell activeRoute="/apply/interviews" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <p className="text-[13px] font-medium text-fg-muted">Applicant workspace</p>
            <h1 className="mt-2 text-[38px] font-semibold leading-[44px] tracking-[-0.8px] text-fg">My Interviews</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-fg-muted">Review invitations, submit availability and manage scheduled interviews across your applications.</p>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="grid gap-4 lg:grid-cols-2">
            {records.map((record) => {
              const isPending = record.interviewDetails?.card === 'rescheduling';
              const isScheduled = record.interviewDetails?.card === 'scheduled';
              const needsAction = record.primaryAction === 'confirm-interview' || record.primaryAction === 'confirm-slot';
              return (
                <Card key={record.id} className="shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">{record.applicationId}</p>
                        <h2 className="mt-2 text-[19px] font-semibold text-fg">{record.programmeName}</h2>
                        <p className="mt-1 text-[13px] text-fg-muted">{record.intake}</p>
                      </div>
                      <Badge variant={needsAction ? 'warning' : isPending ? 'info' : 'success'}>
                        {needsAction ? 'Action required' : isPending ? 'Awaiting confirmation' : isScheduled ? 'Scheduled' : 'Interview'}
                      </Badge>
                    </div>

                    <p className="mt-5 text-[14px] leading-6 text-fg">{record.statusMessage}</p>
                    {isPending && record.interviewDetails?.availabilityNote ? (
                      <div className="mt-5 rounded-lg bg-bg-muted p-4">
                        <p className="text-[11px] text-fg-muted">Requested availability</p>
                        <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-fg">{record.interviewDetails.availabilityNote}</p>
                        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                          <div className="flex gap-2"><Clock3 className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Request status</p><p className="mt-1 text-[13px] font-medium text-fg">Awaiting confirmation</p></div></div>
                          <div className="flex gap-2"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Original invitation</p><p className="mt-1 text-[13px] font-medium text-fg">3 proposed timeslots</p></div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-3 rounded-lg bg-bg-muted p-4 sm:grid-cols-3">
                        <div className="flex gap-2"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Date</p><p className="mt-1 text-[13px] font-medium text-fg">{record.interviewDetails?.selectedDate ?? 'Choose a date'}</p></div></div>
                        <div className="flex gap-2"><Clock3 className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Time</p><p className="mt-1 text-[13px] font-medium text-fg">{record.interviewDetails?.selectedTime ?? 'Choose a time'}</p></div></div>
                        <div className="flex gap-2"><Video className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Format</p><p className="mt-1 text-[13px] font-medium text-fg">{record.interviewDetails?.location ?? 'Microsoft Teams'}</p></div></div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={() => router.push(routeFor(record))}>{needsAction ? 'Select Interview Timeslots' : isPending ? 'View Request Details' : 'View / Manage Interview'}</Button>
                      <Button variant="outline" onClick={() => router.push(`/apply/applications/${record.id}`)}>View Application</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
