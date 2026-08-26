'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Video } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import {
  APPLICANT_INTERVIEW_CONFIRMED_EVENT,
  loadApplicantInterviewSelection,
} from '@/lib/applicant-mentor-interview';
import { formatStatusLabel } from '@/lib/status-label';
import type { ApplicantScenarioInterviewRecord } from '@/lib/types';

function routeFor(record: ApplicantScenarioInterviewRecord) {
  if (record.status === 'ACTION REQUIRED') {
    return '/apply/applicant-interview-review?applicationId=app-ui-2027';
  }
  if (record.status === 'AWAITING MENTOR CONFIRMATION') {
    return '/apply/applicant-interview-confirmation?request=alternate&applicationId=app-ui-2027';
  }
  return '/apply/applications/app-ui-2027';
}

export default function ApplyInterviews() {
  const router = useRouter();
  const { interviews: scenarioRecords } = useApplicantScenarioData();
  const [selectedSlot, setSelectedSlot] = useState(() =>
    typeof window === 'undefined' ? null : loadApplicantInterviewSelection(),
  );

  useEffect(() => {
    const refresh = () => setSelectedSlot(loadApplicantInterviewSelection());
    window.addEventListener(APPLICANT_INTERVIEW_CONFIRMED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(APPLICANT_INTERVIEW_CONFIRMED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const records = useMemo(() => scenarioRecords.map((record) => {
    if (record.status !== 'CONFIRMED' || !selectedSlot) return record;
    return {
      ...record,
      confirmedStart: selectedSlot.displayDateTime,
      statusMessage: `Your mentor interview with Marcus Tan is confirmed for ${selectedSlot.displayDateTime}.`,
    };
  }), [scenarioRecords, selectedSlot]);

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
              const isPending = record.status === 'AWAITING MENTOR CONFIRMATION';
              const isScheduled = record.status === 'CONFIRMED';
              const needsAction = record.status === 'ACTION REQUIRED';
              const isCompleted = record.status === 'COMPLETED';
              return (
                <Card key={record.interviewId} className="shadow-none">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">{record.interviewId}</p>
                        <h2 className="mt-2 text-[19px] font-semibold text-fg">{record.project}</h2>
                        <p className="mt-1 text-[13px] text-fg-muted">University Internship 2027</p>
                      </div>
                      <Badge variant={needsAction ? 'warning' : isPending ? 'info' : isCompleted ? 'subtle' : 'success'}>
                        {formatStatusLabel(record.status)}
                      </Badge>
                    </div>

                    <p className="mt-5 text-[14px] leading-6 text-fg">{record.statusMessage}</p>
                    {isPending && record.applicantAlternativeAvailability ? (
                      <div className="mt-5 rounded-lg bg-bg-muted p-4">
                        <p className="text-[11px] text-fg-muted">Requested availability</p>
                        <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-fg">{record.applicantAlternativeAvailability}</p>
                        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                          <div className="flex gap-2"><Clock3 className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Request status</p><p className="mt-1 text-[13px] font-medium text-fg">Awaiting confirmation</p></div></div>
                          <div className="flex gap-2"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Original invitation</p><p className="mt-1 text-[13px] font-medium text-fg">3 proposed timeslots</p></div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-3 rounded-lg bg-bg-muted p-4 sm:grid-cols-3">
                        <div className="flex gap-2"><CalendarDays className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Confirmed start</p><p className="mt-1 text-[13px] font-medium text-fg">{record.confirmedStart ?? 'Choose a timeslot'}</p></div></div>
                        <div className="flex gap-2"><Clock3 className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">{isScheduled ? 'Status' : 'Respond by'}</p><p className="mt-1 text-[13px] font-medium text-fg">{isScheduled ? 'Confirmed' : record.respondBy}</p></div></div>
                        <div className="flex gap-2"><Video className="mt-0.5 size-4 text-fg-muted" aria-hidden /><div><p className="text-[11px] text-fg-muted">Format</p><p className="mt-1 text-[13px] font-medium text-fg">Microsoft Teams</p></div></div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={() => router.push(routeFor(record))}>{record.primaryCta}</Button>
                      <Button variant="outline" onClick={() => router.push('/apply/applications/app-ui-2027')}>View Application</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {records.length === 0 ? (
              <Card className="lg:col-span-2 shadow-none"><CardContent className="p-10 text-center"><p className="text-[16px] font-semibold text-fg">No interviews yet</p><p className="mt-2 text-[14px] text-fg-muted">Interview invitations and completed interviews will appear here.</p></CardContent></Card>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
