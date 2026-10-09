'use client';

import type { ReactNode } from 'react';
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
  X,
} from 'lucide-react';
import Shell from '@/components/layout/shell';
import SubmittedApplicationDetails from '@/components/apply/submitted-application-details';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui-legacy/select';
import { Textarea } from '@/components/ui/textarea';
import { APPLICANT_WITHDRAWAL_REASONS, applicantWithdrawalSchema } from '@/lib/applicant-withdrawal';
import { loadApplicantApplications, saveApplicantApplications } from '@/lib/applicant-applications';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import { saveApplicantHomeScenario } from '@/lib/applicant-home-scenario';
import { formatStatusLabel } from '@/lib/status-label';
import type { ApplicantApplicationRecord, ApplicantScenarioInterviewRecord, CandidateApplicationStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const JOURNEY_STEPS = ['Submitted', 'Under review', 'Interview', 'Outcome'] as const;
const TERMINAL_STATUSES: ReadonlyArray<CandidateApplicationStatus> = [
  'OFFER DECLINED',
  'OFFER EXPIRED',
  'UNSUCCESSFUL',
  'WITHDRAWN',
];

function statusVariant(status: CandidateApplicationStatus) {
  if (status === 'OFFER ACCEPTED') return 'success' as const;
  if (status === 'OFFER RECEIVED' || status === 'INTERVIEW') return 'warning' as const;
  if (status === 'UNDER REVIEW' || status === 'SUBMITTED') return 'info' as const;
  if (status === 'OFFER DECLINED' || status === 'OFFER EXPIRED' || status === 'UNSUCCESSFUL') return 'danger' as const;
  return 'subtle' as const;
}

function currentStepForStatus(status: CandidateApplicationStatus) {
  if (status === 'DRAFT') return 0;
  if (status === 'SUBMITTED') return 1;
  if (status === 'UNDER REVIEW') return 2;
  if (status === 'INTERVIEW') return 3;
  if (status === 'OFFER RECEIVED') return 4;
  return 4;
}

function reachedStepForTerminalStatus(record: ApplicantApplicationRecord, status: CandidateApplicationStatus) {
  if (status === 'OFFER DECLINED' || status === 'OFFER EXPIRED') return 3;
  if (status === 'WITHDRAWN') return Math.max(1, Math.min(record.currentStep, 3));
  const timelineCopy = record.timeline.map((event) => `${event.title} ${event.description}`).join(' ').toLowerCase();
  if (timelineCopy.includes('interview')) return 3;
  if (timelineCopy.includes('review') || timelineCopy.includes('screen')) return 2;
  return 1;
}

function terminalLabel(status: CandidateApplicationStatus) {
  if (status === 'WITHDRAWN') return 'Withdrawn';
  if (status === 'UNSUCCESSFUL') return 'Unsuccessful';
  if (status === 'OFFER DECLINED') return 'Offer declined';
  return 'Offer expired';
}

function nextStepForStatus(status: CandidateApplicationStatus) {
  const copy: Record<CandidateApplicationStatus, string> = {
    DRAFT: 'Complete and submit your application before the closing date.',
    SUBMITTED: 'The Talent Acquisition team will review your application next.',
    'UNDER REVIEW': 'We will contact you if you are shortlisted for an interview.',
    INTERVIEW: 'Review and complete the required interview action.',
    'OFFER RECEIVED': 'Review and respond to your internship offer before the deadline.',
    'OFFER ACCEPTED': 'Your application is closed. Continue with the required onboarding actions.',
    'OFFER DECLINED': 'This application is closed and remains available for your records.',
    'OFFER EXPIRED': 'This application is closed because the offer response deadline has passed.',
    UNSUCCESSFUL: 'This application is closed and remains available for your records.',
    WITHDRAWN: 'This application is closed and remains available for your records.',
  };
  return copy[status];
}

function timelineForStatus(record: ApplicantApplicationRecord, status: CandidateApplicationStatus) {
  if (status === 'DRAFT') {
    return [{ title: 'Draft saved', description: 'Your latest application details have been saved.', date: record.updatedAt, tone: 'current' as const }];
  }

  const currentTitle: Record<Exclude<CandidateApplicationStatus, 'DRAFT'>, string> = {
    SUBMITTED: 'Application submitted',
    'UNDER REVIEW': 'Screening in progress',
    INTERVIEW: 'Interview stage',
    'OFFER RECEIVED': 'Offer received',
    'OFFER ACCEPTED': 'Offer accepted',
    'OFFER DECLINED': 'Offer declined',
    'OFFER EXPIRED': 'Offer expired',
    UNSUCCESSFUL: 'Application unsuccessful',
    WITHDRAWN: 'Application withdrawn',
  };
  const currentEvent = {
    title: currentTitle[status],
    description: status === 'SUBMITTED'
      ? 'Your application and supporting documents were received successfully.'
      : record.statusMessage,
    date: status === 'SUBMITTED' ? record.submittedAt : record.updatedAt,
    tone: 'current' as const,
  };

  if (status === 'SUBMITTED') return [currentEvent];
  return [
    currentEvent,
    {
      title: 'Application submitted',
      description: 'Your application and supporting documents were received successfully.',
      date: record.submittedAt,
      tone: 'complete' as const,
    },
  ];
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
      <dt className="text-[14px] leading-5 text-fg-muted">{label}</dt>
      <dd className="mt-1 break-words text-[14px] font-medium leading-5 text-fg">{value}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-border py-6 first:pt-0 last:border-0 last:pb-0">
    <h2 className="mb-6 pt-1 text-lg font-semibold leading-[18px] text-fg">{title}</h2>
    {children}
  </section>;
}

function InterviewDetailsCard({ record, interview, onManage }: {
  record: ApplicantApplicationRecord;
  interview?: ApplicantScenarioInterviewRecord;
  onManage: () => void;
}) {
  const details = record.interviewDetails;
  const state = interview?.status ?? (details?.card === 'rescheduling' ? 'AWAITING MENTOR CONFIRMATION' : record.interviewState === 'completed' ? 'COMPLETED' : record.interviewState === 'awaiting-confirmation' ? 'ACTION REQUIRED' : 'CONFIRMED');
  const confirmed = state === 'CONFIRMED';
  const pending = state === 'AWAITING MENTOR CONFIRMATION';
  const completed = state === 'COMPLETED';
  const dateTime = interview?.confirmedStart?.replace(/ SGT$/, '').split(/ at | (?=\d{1,2}:)/);
  const date = confirmed || completed ? (interview ? dateTime?.[0] : details?.selectedDate) : undefined;
  const time = confirmed || completed ? (interview ? dateTime?.slice(1).join(' ') : details?.selectedTime) : undefined;
  return <Card className="p-6 shadow-none">
    <h2 className="pt-1 text-lg font-semibold leading-[18px]">{confirmed ? 'Interview Scheduled' : pending ? 'Interview request under review' : completed ? 'Interview completed' : 'Interview invitation'}</h2>
    {!confirmed && <p className="mt-6 text-sm leading-5 text-fg-muted">{interview?.statusMessage || record.statusMessage}</p>}
    {date && <div className="mt-6 rounded-lg border border-border bg-bg/60 px-4 py-3">
      <p className="text-sm leading-5 text-fg-muted">{completed ? 'Interview date & time' : 'Selected date & time'}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium leading-6">
        <span className="inline-flex items-center gap-2"><img src="/images/application-detail-calendar.svg" alt="" />{date}</span>
        {time && <><span className="h-4 w-px bg-border" aria-hidden /><span className="inline-flex items-center gap-2"><img src="/images/application-detail-clock.svg" alt="" />{time}</span></>}
      </div>
      <p className="text-xs leading-5 text-fg-muted">Singapore Time (SGT)</p>
    </div>}
    {pending && <div className="mt-6 rounded-lg border border-border bg-bg/60 p-4"><p className="text-sm text-fg-muted">Your comments</p><p className="mt-2 whitespace-pre-wrap text-sm leading-5">{interview?.applicantAlternativeAvailability || details?.availabilityNote || 'No comments provided.'}</p></div>}
    <dl className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8">
      <div className="flex items-start gap-2"><img src="/images/application-detail-mentor.svg" alt="" className="shrink-0" /><DetailValue label="Mentor" value={details ? `${details.mentor} · ${details.mentorRole}` : 'Marcus Tan · Digital Hub'} /></div>
      <div className="flex items-start gap-2 sm:border-l sm:border-border sm:pl-8"><img src="/images/application-detail-video.svg" alt="" className="shrink-0" /><DetailValue label="Interview details" value="Online interview · Microsoft Teams · 1 hour" /></div>
    </dl>
    <Button size="sm" className="mt-6 h-8 text-xs" onClick={onManage}>{confirmed ? 'Manage Interview' : pending ? 'View request' : completed ? 'View interview' : 'Choose a timeslot'}</Button>
  </Card>;
}

export default function ApplyApplicationDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { applications: scenarioApplications, interviews: scenarioInterviews } = useApplicantScenarioData();
  const [record, setRecord] = useState<ApplicantApplicationRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawErrors, setWithdrawErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const records = loadApplicantApplications();
    const storedRecord = records.find((item) => item.id === params.id) ?? null;
    const scenarioRecord = storedRecord
      ? scenarioApplications.find((item) => item.applicationId === storedRecord.applicationId)
      : null;
    setRecord(storedRecord && scenarioRecord ? {
      ...storedRecord,
      status: scenarioRecord.statusBadge,
      filter: scenarioRecord.tabGroup,
      statusMessage: scenarioRecord.cardMessage,
      currentStep: TERMINAL_STATUSES.includes(scenarioRecord.statusBadge)
        ? reachedStepForTerminalStatus(storedRecord, scenarioRecord.statusBadge)
        : scenarioRecord.focal && scenarioRecord.statusBadge === 'UNDER REVIEW' && scenarioInterviews.some(item => item.status === 'COMPLETED')
          ? 4
          : currentStepForStatus(scenarioRecord.statusBadge),
      nextStep: scenarioRecord.focal && scenarioRecord.statusBadge === 'INTERVIEW'
        ? scenarioInterviews[0]?.statusMessage ?? nextStepForStatus(scenarioRecord.statusBadge)
        : nextStepForStatus(scenarioRecord.statusBadge),
      deadline: scenarioRecord.actionDeadline ?? undefined,
      timeline: timelineForStatus(
        { ...storedRecord, statusMessage: scenarioRecord.cardMessage },
        scenarioRecord.statusBadge,
      ),
    } : storedRecord);
    setReady(true);
  }, [params.id, scenarioApplications, scenarioInterviews]);

  const canWithdraw = useMemo(
    () => !!record && ['SUBMITTED', 'UNDER REVIEW', 'INTERVIEW'].includes(record.status),
    [record],
  );

  const journeyItems = useMemo(() => {
    if (!record) return [];
    if (TERMINAL_STATUSES.includes(record.status)) {
      const reachedStep = Math.max(1, Math.min(record.currentStep, 3));
      return [
        ...JOURNEY_STEPS.slice(0, reachedStep).map((label) => ({ label, state: 'complete' as const, hint: undefined })),
        { label: terminalLabel(record.status), state: 'terminal' as const, hint: undefined },
      ];
    }

    return JOURNEY_STEPS.map((label, index) => {
      const stepNumber = index + 1;
      const accepted = record.status === 'OFFER ACCEPTED';
      const state = accepted || stepNumber < record.currentStep
        ? 'complete' as const
        : stepNumber === record.currentStep
          ? 'current' as const
          : 'upcoming' as const;
      const hint = label === 'Outcome'
        ? record.status === 'OFFER RECEIVED'
          ? 'Offer received'
          : record.status === 'OFFER ACCEPTED'
            ? 'Offer accepted'
            : undefined
        : undefined;
      return { label, state, hint };
    });
  }, [record]);

  function withdrawApplication() {
    if (!record || !canWithdraw) return;
    const result = applicantWithdrawalSchema.safeParse({ reason: withdrawReason, details: withdrawDetails });
    if (!result.success) {
      setWithdrawErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    const withdrawnAt = new Date().toISOString();
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(withdrawnAt));
    const updated: ApplicantApplicationRecord = {
      ...record,
      withdrawal: { ...result.data, withdrawnAt },
      updatedAt: date,
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
          date,
          tone: 'current',
        },
        ...record.timeline,
      ],
    };
    saveApplicantApplications(loadApplicantApplications().map((item) => (item.id === record.id ? updated : item)));
    if (scenarioApplications.some(item => item.focal && item.applicationId === record.applicationId)) {
      saveApplicantHomeScenario('application-withdrawn');
    }
    setRecord(updated);
    closeWithdrawDialog();
  }

  function openWithdrawDialog() {
    setWithdrawReason('');
    setWithdrawDetails('');
    setWithdrawErrors({});
    setWithdrawOpen(true);
  }

  function closeWithdrawDialog() {
    setWithdrawReason('');
    setWithdrawDetails('');
    setWithdrawErrors({});
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

  const focal = scenarioApplications.find(item => item.applicationId === record.applicationId)?.focal;
  const interview = focal ? scenarioInterviews[0] : undefined;
  const closed = TERMINAL_STATUSES.includes(record.status);
  const showInterview = !closed && (record.status === 'INTERVIEW' || (record.status === 'UNDER REVIEW' && interview?.status === 'COMPLETED'));
  const fields = record.detailFields;
  const fieldGrid = (items: Array<[string, string | undefined]>) => <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">{items.map(([label, value]) => <DetailValue key={label} label={label} value={value || 'Not provided'} />)}</dl>;
  const stageTitle = record.status === 'DRAFT' ? 'Continue your application' : record.status === 'SUBMITTED' ? 'Application submitted' : record.status === 'UNDER REVIEW' ? 'Application under review' : record.status === 'OFFER RECEIVED' ? 'Your internship offer is ready' : record.status === 'OFFER ACCEPTED' ? 'Offer accepted' : closed ? terminalLabel(record.status) : 'Application status';
  const stageAction = record.status === 'DRAFT' ? { label: 'Continue application', href: '/apply/review' } : record.status === 'OFFER RECEIVED' ? { label: 'Review offer', href: '/apply/applicant-offer-detail?applicationId=' + record.id } : record.status === 'OFFER ACCEPTED' ? { label: 'View internship', href: '/apply/internship' } : null;

  return (
      <Shell activeRoute="/apply/applications" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg">
        <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-5">
          <header>
            <nav aria-label="Breadcrumb" className="flex min-h-9 flex-wrap items-center gap-1.5 text-sm">
              <button onClick={() => router.push('/apply/applications')} className="text-fg-muted hover:text-accent">My Applications</button>
              <img src="/images/application-detail-breadcrumb.svg" alt="" />
              <span className="font-medium" aria-current="page">{record.programmeName}</span>
            </nav>
            <div className="mt-4 pb-1.5">
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold leading-7">{record.programmeName}</h1><Badge variant={statusVariant(record.status)}>{formatStatusLabel(record.status)}</Badge></div>
              <p className="mt-2 text-sm text-fg-muted">{record.applicationId}</p>
            </div>
            <div className="my-6 overflow-x-auto py-4">
              <ol className="flex min-w-[620px] items-center" aria-label="Application journey progress">
              {journeyItems.map((step, index) => {
                const complete = step.state === 'complete';
                const current = step.state === 'current';
                const terminal = step.state === 'terminal';
                return (
                  <li key={`${step.label}-${index}`} className={cn('flex items-center', index < journeyItems.length - 1 && 'flex-1')}>
                    <span
                      className={cn(
                        'inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border text-[12px] font-medium',
                        complete && 'border-0',
                        current && 'border-accent bg-accent text-accent-fg',
                        terminal && 'border-danger bg-danger text-accent-fg',
                        !complete && !current && !terminal && 'border-border bg-bg-muted text-fg-muted',
                      )}
                    >
                      {complete ? <img src="/images/application-detail-complete.svg" alt="" /> : terminal ? <X className="size-4" aria-hidden /> : index + 1}
                    </span>
                    <span className={cn('ml-2 whitespace-nowrap text-[14px]', complete || current || terminal ? 'text-fg' : 'text-fg-muted')}>
                      {step.label}
                      {step.hint ? <span className="block text-[11px] font-normal text-fg-muted">{step.hint}</span> : null}
                    </span>
                    {index < journeyItems.length - 1 ? (
                      <span className={cn('mx-2 h-px min-w-8 flex-1', complete ? 'bg-fg-muted/50' : 'bg-border')} aria-hidden />
                    ) : null}
                  </li>
                );
              })}
              </ol>
            </div>
          </header>
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,897fr)_minmax(280px,411fr)]">
            <div className="min-w-0 space-y-4">
              {showInterview ? <InterviewDetailsCard record={record} interview={interview} onManage={() => router.push('/apply/interviews')} /> : (
                <Card className="p-6 shadow-none">
                  <h2 className="text-lg font-semibold">{stageTitle}</h2>
                  <p className="mt-3 text-sm leading-5 text-fg-muted">{record.statusMessage}</p>
                  {record.deadline && !closed && <p className="mt-3 text-sm text-warning">{record.deadline}</p>}
                  {stageAction && <Button size="sm" className="mt-6 h-8 text-xs" onClick={() => router.push(stageAction.href)}>{stageAction.label}</Button>}
                </Card>
              )}
              <Card className="min-w-0 p-6 shadow-none">
                <DetailSection title="Personal details">
                  {fieldGrid([['Full name', fields?.personal.fullName || record.summary.personal.split(' · ')[0]], ['NRIC', fields?.personal.nric], ['Nationality', fields?.personal.nationality || record.summary.personal.split(' · ')[1]], ['Residential status', fields?.personal.residentialStatus], ['Sex', fields?.personal.sex], ['Date of birth', fields?.personal.dateOfBirth], ['Race', fields?.personal.race], ['Photo', fields?.personal.photo]])}
                </DetailSection>
                <DetailSection title="Contact details">
                  {fieldGrid([['Mobile number', fields?.contact.mobile], ['Email', fields?.contact.email]])}
                  <dl className="mt-4"><DetailValue label="Registered address" value={fields?.contact.address || 'Not provided'} /></dl>
                </DetailSection>
                <DetailSection title="Education">
                  {fieldGrid([['Institution', fields?.education.institution || record.summary.education.split(' · ')[0]], ['Course of study', fields?.education.course || record.summary.education.split(' · ')[1]], ['Year of study', fields?.education.year || record.summary.education.split(' · ')[2]], ['GPA', fields?.education.gpa], ['Expected graduation', fields?.education.graduation]])}
                </DetailSection>
                <DetailSection title="Availability">
                  {fields ? fieldGrid([['Preferred internship start date', fields.availability.start], ['Preferred internship end date', fields.availability.end]]) : <dl><DetailValue label="Preferred internship period" value={record.summary.availability} /></dl>}
                </DetailSection>
                <DetailSection title="Project preferences">
                  <dl><DetailValue label="Areas of interest" value={record.summary.interests.join(', ') || 'Not provided'} /></dl>
                  <p className="mb-2 mt-4 text-sm leading-5 text-fg-muted">Ranked project preferences</p>
                  <ol className="space-y-4 rounded-lg border border-border bg-bg/60 p-4">
                    {record.summary.projectPreferences.map((project, index) => <li key={project} className="flex items-center gap-4 text-sm font-medium"><span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-bg-muted text-sm font-normal">{index + 1}</span>{project}</li>)}
                    {record.summary.projectPreferences.length === 0 && <li className="text-sm text-fg-muted">No projects selected.</li>}
                  </ol>
                </DetailSection>
                <DetailSection title="Additional details">
                  {fieldGrid([['Bonded scholarship recipient', fields?.additional.scholarshipRecipient], ['Scholarship name', fields?.additional.scholarshipName], ['Credit-bearing internship', fields?.additional.creditBearing], ['School requirements / module code', fields?.additional.moduleCode]])}
                </DetailSection>
                <DetailSection title="Declarations">
                  {fields && record.status !== 'DRAFT' ? <div className="space-y-4">
                    <label className="flex items-start gap-3 text-sm leading-5"><Checkbox aria-label="Personal data consent declaration" checked={fields.declarations.consent} readOnly className="mt-0.5" /><span>I consent to the collection, use and disclosure of my personal data for the assessment and administration of my internship application.</span></label>
                    <label className="flex items-start gap-3 text-sm leading-5"><Checkbox aria-label="Information accuracy declaration" checked={fields.declarations.accurate} readOnly className="mt-0.5" /><span>I declare that the information and supporting documents provided in this application are true and accurate.</span></label>
                  </div> : <p className="text-sm text-fg-muted">{record.status === 'DRAFT' ? 'Complete your declarations before submitting your application.' : 'Declaration details are not available for this record.'}</p>}
                </DetailSection>
                <DetailSection title="Documents">
                  <div className="space-y-2">{record.documents.map(document => <div key={document.fileName} className="flex min-h-[60px] items-center gap-3 rounded-lg border border-border bg-bg/60 px-4 py-3">
                    <img src={`/images/application-detail-${document.kind === 'resume' ? 'resume' : document.kind === 'transcript' ? 'transcript' : 'portfolio'}.png`} alt="" className="h-[20px] w-[20px] shrink-0 object-cover mix-blend-multiply" />
                    <div className="min-w-0 flex-1"><p className="text-xs font-medium leading-[14px]">{document.label}</p><p className="mt-1 break-words text-xs leading-4 text-fg-muted">{document.fileName} · {document.meta}</p></div>
                    <Button size="sm" variant="ghost" className="h-auto shrink-0 gap-2 px-0 text-xs font-normal" aria-label={`Download ${document.label}`} onClick={() => downloadMockDocument(document.fileName)}><img src="/images/application-detail-download.svg" alt="" /><span className="hidden sm:inline">Download</span></Button>
                  </div>)}</div>
                  {record.documents.length === 0 && <p className="text-sm text-fg-muted">No documents uploaded.</p>}
                </DetailSection>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-[18px]">Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(record.submissionDetails?.documents ?? record.documents).map((document) => (
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

            </div>

            <aside className="min-w-0 space-y-4">
              <Card className="p-6 shadow-none">
                <h2 className="mb-6 text-lg font-semibold leading-[18px]">Key details</h2>
                <dl className="mb-4"><DetailValue label="Programme" value={record.programmeName} /></dl>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <DetailValue label="Location" value={record.location} /><DetailValue label="Type" value={record.type} />
                  <DetailValue label="Department" value={record.department} /><DetailValue label={record.status === 'DRAFT' ? 'Created' : 'Applied'} value={record.submittedAt} />
                  <DetailValue label="Last updated" value={record.updatedAt} /><DetailValue label="Application ID" value={record.applicationId} />
                </dl>
                {canWithdraw && <div className="mt-6 border-t border-border pt-6"><p className="mb-2 text-sm text-fg-muted">Application actions</p><Button size="sm" variant="danger" className="h-8 text-xs" onClick={openWithdrawDialog}>Withdraw Application</Button></div>}
              </Card>
              <Card className="p-6 shadow-none"><h2 className="text-lg font-semibold leading-[18px]">Need help?</h2><a href={`mailto:${record.contactEmail}`} className="mt-6 inline-block break-all text-sm leading-5 text-accent hover:underline">{record.contactEmail}</a></Card>
            </aside>
          </div>
        </div>
        <footer className="sticky bottom-0 z-10 border-t border-border bg-surface px-6 py-4"><div className="mx-auto max-w-[1392px]"><Button variant="ghost" onClick={() => router.push('/apply/applications')}>Back</Button></div></footer>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={(open) => { if (!open) closeWithdrawDialog(); }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogTitle className="text-[20px] tracking-normal">Withdraw application</DialogTitle>
          <DialogDescription>Please fill in all mandatory fields marked with an asterisk (*).</DialogDescription>
          <p className="text-body-md text-fg">
            You are about to withdraw your application to <strong>{record.programmeName}</strong>
          </p>
          <form noValidate onSubmit={(event) => { event.preventDefault(); withdrawApplication(); }} className="space-y-6">
            <div className="space-y-2">
              <label id="withdraw-reason-label" htmlFor="withdraw-reason" className="block text-body-md text-fg">
                Please indicate the reason for your withdrawal:*
              </label>
              <Select value={withdrawReason || null} onValueChange={(value) => {
                setWithdrawReason(value ?? '');
                setWithdrawErrors((errors) => ({ ...errors, reason: '' }));
              }}>
                <SelectTrigger id="withdraw-reason" aria-labelledby="withdraw-reason-label" aria-required="true" aria-invalid={!!withdrawErrors.reason} aria-describedby={withdrawErrors.reason ? 'withdraw-reason-error' : undefined} className="h-auto min-h-9 text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLICANT_WITHDRAWAL_REASONS.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                </SelectContent>
              </Select>
              {withdrawErrors.reason && <p id="withdraw-reason-error" role="alert" className="text-body-sm text-danger">{withdrawErrors.reason}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="withdraw-details" className="block text-body-md text-fg">Please provide details of your withdrawal:*</label>
              <Textarea id="withdraw-details" rows={4} required value={withdrawDetails} onChange={(event) => {
                setWithdrawDetails(event.target.value);
                setWithdrawErrors((errors) => ({ ...errors, details: '' }));
              }} aria-invalid={!!withdrawErrors.details} aria-describedby={withdrawErrors.details ? 'withdraw-details-error' : undefined} />
              {withdrawErrors.details && <p id="withdraw-details-error" role="alert" className="text-body-sm text-danger">{withdrawErrors.details}</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit" variant="danger">Withdraw application</Button>
              <Button type="button" variant="outline" onClick={closeWithdrawDialog}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
