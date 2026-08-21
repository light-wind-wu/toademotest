'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  UserRound,
  Video,
} from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Modal from '@/components/ui-legacy/modal';
import { loadApplicantApplications, saveApplicantApplications } from '@/lib/applicant-applications';
import type { ApplicantApplicationRecord, CandidateApplicationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const JOURNEY_STEPS = ['Submitted', 'Under review', 'Interview', 'Offer', 'Outcome'];

function statusVariant(status: CandidateApplicationStatus) {
  if (status === 'OFFER ACCEPTED') return 'success' as const;
  if (status === 'OFFER RECEIVED' || status === 'INTERVIEW') return 'warning' as const;
  if (status === 'UNDER REVIEW' || status === 'SUBMITTED') return 'info' as const;
  return 'subtle' as const;
}

function downloadMockDocument(fileName: string) {
  const blob = new Blob([`Prototype document: ${fileName}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.replace(/\.pdf$/i, '.txt');
  anchor.click();
  URL.revokeObjectURL(url);
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] leading-5 text-fg-muted">{label}</dt>
      <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">{value}</dd>
    </div>
  );
}

function InterviewDetailsCard({
  record,
  onManage,
  onReschedule,
}: {
  record: ApplicantApplicationRecord;
  onManage: () => void;
  onReschedule: () => void;
}) {
  const details = record.interviewDetails;
  if (!details) return null;

  const isRescheduling = details.card === 'rescheduling';

  return (
    <Card className="overflow-hidden border-accent/30 shadow-none">
      <div className={cn('h-1', isRescheduling ? 'bg-warning' : 'bg-accent')} aria-hidden />
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted">
              Interview · {isRescheduling ? 'Time Change Requested' : 'Timeslot Selected'}
            </p>
            <CardTitle className="mt-2 text-[20px]">
              {isRescheduling ? 'Interview Rescheduling' : 'Interview Scheduled'}
            </CardTitle>
          </div>
          <Badge variant={isRescheduling ? 'warning' : 'info'}>
            {isRescheduling ? 'Awaiting confirmation' : 'Timeslot selected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-bg-muted p-4">
          <p className="text-[12px] font-medium text-fg-muted">
            {isRescheduling ? 'Suggested date & time' : 'Selected date & time'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[16px] font-semibold text-fg">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-accent" aria-hidden />
              {details.selectedDate}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-accent" aria-hidden />
              {details.selectedTime}
            </span>
          </div>
          <p className="mt-2 text-[12px] text-fg-muted">{details.timezone}</p>
        </div>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <UserRound className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
            <DetailValue label="Mentor" value={`${details.mentor} · ${details.mentorRole}`} />
          </div>
          <div className="flex gap-3">
            <Video className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
            <DetailValue label="Interview details" value={`${details.format} · ${details.location} · ${details.duration}`} />
          </div>
        </dl>

        {isRescheduling ? (
          <div className="mt-5 rounded-lg border border-border bg-bg px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[12px] text-fg-muted">Request status</p>
                <p className="mt-1 text-[14px] font-medium text-warning">{details.requestStatus}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[12px] text-fg-muted">Original slot</p>
                <p className="mt-1 text-[14px] text-fg">
                  {details.originalDate} · {details.originalTime}
                </p>
              </div>
            </div>
            <p className="mt-3 border-t border-border pt-3 text-[13px] leading-5 text-fg-muted">
              No action is needed. We will notify you when the interviewer confirms the suggested time.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onManage}>{isRescheduling ? 'View request details' : 'View / Manage Interview'}</Button>
          {!isRescheduling ? (
            <Button variant="outline" onClick={onReschedule}>Suggest another time</Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApplyApplicationDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<ApplicantApplicationRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAcknowledged, setWithdrawAcknowledged] = useState(false);

  useEffect(() => {
    const records = loadApplicantApplications();
    setRecord(records.find((item) => item.id === params.id) ?? null);
    setReady(true);
  }, [params.id]);

  const canWithdraw = useMemo(
    () => !!record && ['SUBMITTED', 'UNDER REVIEW', 'INTERVIEW'].includes(record.status),
    [record],
  );

  function withdrawApplication() {
    if (!record) return;
    const updated: ApplicantApplicationRecord = {
      ...record,
      status: 'WITHDRAWN',
      filter: 'closed',
      statusMessage: 'You withdrew this application. It is now read-only.',
      nextStep: 'This application is closed and remains available for your records.',
      deadline: undefined,
      primaryAction: undefined,
      timeline: [
        {
          title: 'Application withdrawn',
          description: 'You withdrew this application and cancelled any pending candidate actions.',
          date: '19 Aug 2026',
          tone: 'current',
        },
        ...record.timeline,
      ],
    };
    saveApplicantApplications(loadApplicantApplications().map((item) => (item.id === record.id ? updated : item)));
    setRecord(updated);
    setWithdrawOpen(false);
    setWithdrawAcknowledged(false);
  }

  function openWithdrawDialog() {
    setWithdrawAcknowledged(false);
    setWithdrawOpen(true);
  }

  function closeWithdrawDialog() {
    setWithdrawAcknowledged(false);
    setWithdrawOpen(false);
  }

  if (!ready) return null;

  if (!record) {
    return (
      <Shell activeRoute="/apply/applications">
        <Card className="mx-auto mt-12 max-w-xl p-8 text-center shadow-none">
          <FileText className="mx-auto size-7 text-fg-muted" aria-hidden />
          <h1 className="mt-4 text-[22px] font-semibold text-fg">Application not found</h1>
          <p className="mt-2 text-[14px] text-fg-muted">This application may have been removed or is no longer available.</p>
          <Button className="mt-6" onClick={() => router.push('/apply/applications')}>Back to applications</Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell activeRoute="/apply/applications" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <header className="bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <button
              type="button"
              onClick={() => router.push('/apply/applications')}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-fg-muted hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              My Applications
            </button>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[30px] font-semibold leading-9 tracking-[-0.5px] text-fg">{record.programmeName}</h1>
                <Badge variant={statusVariant(record.status)}>{record.status}</Badge>
              </div>
              <p className="mt-2 text-[14px] leading-5 text-fg-muted">
                {record.intake} · {record.applicationId}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[12px] text-fg-muted">Current next step</p>
              <p className="mt-1 max-w-sm text-[14px] font-medium leading-5 text-fg">{record.nextStep}</p>
            </div>
          </div>

            <div className="mt-9 overflow-x-auto pb-2">
              <ol className="flex min-w-[720px] items-center" aria-label="Application journey progress">
              {JOURNEY_STEPS.map((step, index) => {
                const stepNumber = index + 1;
                const complete = stepNumber < record.currentStep;
                const current = stepNumber === record.currentStep;
                return (
                  <li key={step} className={cn('flex items-center', index < JOURNEY_STEPS.length - 1 && 'flex-1')}>
                    <span
                      className={cn(
                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium',
                        complete && 'border-success bg-success text-accent-fg',
                        current && 'border-accent bg-accent text-accent-fg',
                        !complete && !current && 'border-border bg-bg-muted text-fg-muted',
                      )}
                    >
                      {complete ? <Check className="size-4" aria-hidden /> : stepNumber}
                    </span>
                    <span className={cn('ml-2 whitespace-nowrap text-[14px]', complete || current ? 'text-fg' : 'text-fg-muted')}>
                      {step}
                    </span>
                    {index < JOURNEY_STEPS.length - 1 ? (
                      <span className={cn('mx-3 h-px min-w-8 flex-1', complete ? 'bg-success' : 'bg-border')} aria-hidden />
                    ) : null}
                  </li>
                );
              })}
              </ol>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(300px,1fr)]">
            <div className="space-y-4">
              {record.interviewDetails ? (
                <InterviewDetailsCard
                  record={record}
                  onManage={() => router.push('/apply/interviews')}
                  onReschedule={() => router.push('/apply/interview-proposed')}
                />
              ) : null}

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-[18px]">Application timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol aria-label="Application timeline">
                    {record.timeline.map((event, index) => (
                      <li key={`${event.title}-${event.date}`} className="flex gap-5">
                        <div className="flex w-3 shrink-0 flex-col items-center">
                          <span
                            className={cn(
                              'mt-1 size-3 shrink-0 rounded-full',
                              event.tone === 'current' && 'bg-accent',
                              event.tone === 'complete' && 'bg-success',
                              event.tone === 'neutral' && 'bg-border-strong',
                            )}
                            aria-hidden
                          />
                          {index < record.timeline.length - 1 ? <span className="min-h-12 w-px flex-1 bg-border" aria-hidden /> : null}
                        </div>
                        <div className={cn('flex min-w-0 flex-1 flex-col gap-2 pb-7 sm:flex-row sm:justify-between', index === record.timeline.length - 1 && 'pb-0')}>
                          <div>
                            <h2 className="text-[16px] font-medium leading-6 text-fg">{event.title}</h2>
                            <p className="mt-1 text-[13px] leading-5 text-fg-muted">{event.description}</p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-fg-muted">
                            <CalendarDays className="size-4" aria-hidden />
                            {event.date}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-[18px]">Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {record.documents.map((document) => (
                    <div key={document.fileName} className="flex items-center gap-4 rounded-lg border border-border bg-bg p-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-bg-muted text-accent">
                        <FileText className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-fg">{document.label}</p>
                        <p className="mt-1 truncate text-[12px] text-fg-muted">{document.fileName} · {document.meta}</p>
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Download ${document.label}`} onClick={() => downloadMockDocument(document.fileName)}>
                        <Download className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-[18px]">Application summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <dl className="grid gap-5 md:grid-cols-3">
                    <div className="flex gap-3">
                      <UserRound className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
                      <DetailValue label="Personal" value={record.summary.personal} />
                    </div>
                    <div className="flex gap-3">
                      <GraduationCap className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
                      <DetailValue label="Education" value={record.summary.education} />
                    </div>
                    <div className="flex gap-3">
                      <CalendarDays className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
                      <DetailValue label="Availability" value={record.summary.availability} />
                    </div>
                  </dl>
                  <div className="border-t border-border pt-5">
                    <p className="text-[13px] text-fg-muted">Areas of interest</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {record.summary.interests.map((interest) => <Badge key={interest} variant="subtle">{interest}</Badge>)}
                    </div>
                  </div>
                  <div className="border-t border-border pt-5">
                    <p className="text-[13px] text-fg-muted">Ranked project preferences</p>
                    <ol className="mt-3 space-y-2">
                      {record.summary.projectPreferences.map((project, index) => (
                        <li key={project} className="flex items-center gap-3 rounded-md bg-bg-muted px-3 py-2 text-[14px] text-fg">
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-medium text-fg-muted">{index + 1}</span>
                          {project}
                        </li>
                      ))}
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[18px]">Key details</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-x-5 gap-y-5">
                    <div className="col-span-2"><DetailValue label="Programme" value={record.programmeName} /></div>
                    <div className="col-span-2"><DetailValue label="Intake" value={record.intake} /></div>
                    <DetailValue label="Location" value={record.location} />
                    <DetailValue label="Type" value={record.type} />
                    <DetailValue label="Department" value={record.department} />
                    <DetailValue label="Applied" value={record.submittedAt} />
                    <DetailValue label="Last updated" value={record.updatedAt} />
                    <DetailValue label="Application ID" value={record.applicationId} />
                  </dl>
                  {canWithdraw ? (
                    <div className="mt-6 border-t border-border pt-5">
                      <p className="text-[12px] font-medium text-fg-muted">Application actions</p>
                      <Button
                        variant="subtle"
                        size="sm"
                        className="mt-3 border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15"
                        onClick={openWithdrawDialog}
                      >
                        Withdraw application
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[18px]">Contact</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-[14px] leading-5 text-fg-muted">Questions about your application or its progress? Contact the internship team.</p>
                  <a href={`mailto:${record.contactEmail}`} className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-[14px] font-medium text-accent hover:bg-bg-muted">
                    <Mail className="size-4" aria-hidden />
                    {record.contactEmail}
                  </a>
                </CardContent>
              </Card>

              <Card className="relative min-h-[220px] overflow-hidden shadow-none">
                <CardContent className="relative z-[1] p-6 pr-32">
                  <h2 className="text-[18px] font-semibold text-accent">Next steps</h2>
                  <p className="mt-3 text-[14px] leading-5 text-fg-muted">{record.nextStep}</p>
                  {record.deadline ? <p className="mt-3 text-[13px] font-medium text-warning">{record.deadline}</p> : null}
                </CardContent>
                <div className="pointer-events-none absolute bottom-0 right-0 h-[150px] w-[150px]" aria-hidden>
                  <Image src="/images/activity-v1.png" alt="" fill className="object-contain object-right-bottom" sizes="150px" />
                </div>
              </Card>

            </aside>
          </div>
        </div>
      </div>

      <Modal open={withdrawOpen} onClose={closeWithdrawDialog} labelledBy="withdraw-title" destructive>
        <h2 id="withdraw-title" className="text-[20px] font-semibold text-fg">Withdraw this application?</h2>
        <p className="mt-2 text-[14px] leading-5 text-fg-muted">
          This permanently closes your application for {record.programmeName} and cancels any pending interview or offer actions.
        </p>
        <div className="mt-5 flex gap-3 rounded-lg border border-danger/30 bg-danger/5 p-4">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div>
            <p className="text-[14px] font-medium text-fg">This action cannot be undone.</p>
            <p className="mt-1 text-[13px] leading-5 text-fg-muted">
              You will still be able to view the application, but you cannot reopen or continue it.
            </p>
          </div>
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-fg">
          <Checkbox
            className="mt-0.5"
            checked={withdrawAcknowledged}
            onCheckedChange={(checked) => setWithdrawAcknowledged(checked === true)}
          />
          <span>I understand that withdrawing this application is permanent.</span>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" autoFocus onClick={closeWithdrawDialog}>Keep application</Button>
          <Button variant="danger" disabled={!withdrawAcknowledged} onClick={withdrawApplication}>Withdraw application</Button>
        </div>
      </Modal>
    </Shell>
  );
}
