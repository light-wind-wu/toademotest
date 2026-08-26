'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Info,
  Mail,
  MessageSquareHeart,
  Quote,
  Share2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import Shell from '@/components/layout/shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { loadApplicantApplications, saveApplicantApplications } from '@/lib/applicant-applications';
import {
  confirmApplicantMentorInterview,
  loadApplicantInterviewSelection,
} from '@/lib/applicant-mentor-interview';
import { APPLICANT_WORKFLOW_CONFIG } from '@/lib/applicant-workflows';
import { formatStatusLabel } from '@/lib/status-label';
import type { ApplicantWorkflowPageId } from '@/lib/types';
import { cn } from '@/lib/utils';

const INTERVIEW_SLOTS = [
  { id: 'slot-1', date: '27 Aug 2026', time: '2:30 PM - 3:30 PM' },
  { id: 'slot-2', date: '28 Aug 2026', time: '10:00 AM - 11:00 AM' },
  { id: 'slot-3', date: '31 Aug 2026', time: '4:00 PM - 5:00 PM' },
] as const;

const interviewSlotSchema = z.enum(['slot-1', 'slot-2', 'slot-3']);
const alternativeAvailabilitySchema = z.string().trim().min(10, 'Please provide a little more detail about your availability.').max(500);
const INTERVIEW_AVAILABILITY_REQUEST_KEY = 'dsta_interview_availability_request';

function pageIdFromPath(pathname: string): ApplicantWorkflowPageId {
  return pathname.split('/').filter(Boolean).at(-1) as ApplicantWorkflowPageId;
}

function downloadCertificate() {
  const content = [
    'DSTA Internship Certificate of Completion',
    'Jenny Aw',
    'University Internship 2026',
    'Cybersecurity Threat Analysis',
    '23 Jun 2026 – 19 Sep 2026',
    'Certificate ID: DSTA-INT-2026-00418',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'DSTA-Internship-Certificate-Jenny-Aw.txt';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ApplicantWorkflowPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pageId = pageIdFromPath(pathname);
  const config = APPLICANT_WORKFLOW_CONFIG[pageId];
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('Daniel Aw');
  const [contactPhone, setContactPhone] = useState('+65 9123 4567');
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const [selectedInterviewSlot, setSelectedInterviewSlot] = useState('');
  const [requestingAlternative, setRequestingAlternative] = useState(false);
  const [alternativeAvailability, setAlternativeAvailability] = useState('');
  const [alternativeError, setAlternativeError] = useState('');
  const [submittedAlternativeAvailability, setSubmittedAlternativeAvailability] = useState('');
  const [submittedInterviewSlot, setSubmittedInterviewSlot] = useState('Selected timeslot shared with the interview team.');

  const isInterviewReview = pageId === 'applicant-interview-review';
  const isInterviewConfirmation = pageId === 'applicant-interview-confirmation';
  const isReject = pageId === 'applicant-offer-reject';
  const isRequirement = pageId === 'applicant-onboarding-requirement';
  const isTestimonial = pageId === 'applicant-testimonial-request';
  const isLinkedIn = pageId === 'applicant-linkedin-share';
  const isCertificate = pageId === 'applicant-certificate-viewer';
  const isOffboarding = pageId === 'applicant-offboarding';
  const isOfferWorkflow = pageId.startsWith('applicant-offer-');
  const decision = searchParams.get('decision');
  const isAlternativeInterviewRequest = isInterviewConfirmation && searchParams.get('request') === 'alternate';

  useEffect(() => {
    if (!isInterviewConfirmation) return;
    try {
      if (isAlternativeInterviewRequest) {
        setSubmittedAlternativeAvailability(sessionStorage.getItem(INTERVIEW_AVAILABILITY_REQUEST_KEY) ?? 'Availability shared with the interview team.');
      } else {
        setSubmittedInterviewSlot(loadApplicantInterviewSelection()?.displayDateTime ?? 'Selected timeslot shared with the interview team.');
      }
    } catch {
      if (isAlternativeInterviewRequest) setSubmittedAlternativeAvailability('Availability shared with the interview team.');
    }
  }, [isAlternativeInterviewRequest, isInterviewConfirmation]);

  const effectiveTitle = isAlternativeInterviewRequest
    ? 'Interview time change requested'
    : pageId === 'applicant-offer-confirmation'
    ? decision === 'rejected' ? 'Your offer has been declined' : 'Your offer has been accepted'
    : config?.title;
  const effectiveEyebrow = isAlternativeInterviewRequest ? 'Interview · Time change requested' : config?.eyebrow;
  const effectiveDescription = isAlternativeInterviewRequest
    ? 'Your request to update the interview schedule has been sent to the interview team for review.'
    : config?.description;
  const effectivePrimaryLabel = pageId === 'applicant-offer-confirmation' && decision === 'rejected'
    ? 'View Application'
    : isAlternativeInterviewRequest
      ? 'Back to My Interviews'
    : isInterviewReview
      ? requestingAlternative ? 'Submit Time Request' : 'Confirm Timeslot'
      : config?.primaryLabel;
  const effectiveStatus = isAlternativeInterviewRequest ? 'Awaiting interview team confirmation' : config?.status;
  const effectiveSecondaryLabel = isAlternativeInterviewRequest ? 'View Application' : config?.secondaryLabel;
  const effectiveSecondaryRoute = isAlternativeInterviewRequest
    ? `/apply/applications/${searchParams.get('applicationId') ?? 'app-poly-2027'}`
    : config?.secondaryRoute;
  const effectiveDetails = isAlternativeInterviewRequest
    ? [
        { label: 'Request type', value: 'Alternative interview time' },
        { label: 'Availability provided', value: submittedAlternativeAvailability || 'Availability shared with the interview team.' },
        { label: 'Mentor', value: 'Aisha Rahman · Digital Hub' },
        { label: 'Expected update', value: 'Within 2 working days' },
      ]
    : isInterviewConfirmation
      ? [
          { label: 'Status', value: 'Confirmed' },
          { label: 'Interview time', value: submittedInterviewSlot },
          { label: 'Format', value: 'Microsoft Teams · 1 hour' },
        ]
    : config?.details ?? [];
  const effectiveNotice = isAlternativeInterviewRequest
    ? 'No further action is needed. Your original invitation remains on record while the interview team coordinates a suitable time.'
    : isInterviewReview && requestingAlternative
      ? 'Your suggested availability will be sent as a request. The interview is not confirmed until the interview team responds.'
      : config?.notice;

  const primaryDisabled = useMemo(() => {
    if (config?.checklist?.length && pageId === 'applicant-offer-review') {
      return config.checklist.some((_, index) => !checks[index]);
    }
    if (isRequirement) return !contactName.trim() || !contactPhone.trim();
    if (isTestimonial) return notes.trim().length < 10;
    if (isInterviewReview) {
      return requestingAlternative
        ? !alternativeAvailabilitySchema.safeParse(alternativeAvailability).success
        : !interviewSlotSchema.safeParse(selectedInterviewSlot).success;
    }
    return false;
  }, [alternativeAvailability, checks, config?.checklist, contactName, contactPhone, isInterviewReview, isRequirement, isTestimonial, notes, requestingAlternative, selectedInterviewSlot]);

  if (!config) {
    return (
      <Shell activeRoute="/apply/dashboard">
        <Card className="mx-auto mt-12 max-w-xl p-8 text-center shadow-none">
          <h1 className="text-[22px] font-semibold text-fg">Workflow page not found</h1>
          <Button className="mt-6" onClick={() => router.push('/apply/dashboard')}>Back to Home</Button>
        </Card>
      </Shell>
    );
  }

  function continueFlow() {
    if (isInterviewReview) {
      const applicationId = searchParams.get('applicationId') ?? 'app-poly-2027';
      if (requestingAlternative) {
        const result = alternativeAvailabilitySchema.safeParse(alternativeAvailability);
        if (!result.success) {
          setAlternativeError(result.error.issues[0]?.message ?? 'Please describe your availability.');
          return;
        }
        try {
          sessionStorage.setItem(INTERVIEW_AVAILABILITY_REQUEST_KEY, result.data);
        } catch {
          /* Prototype storage can be unavailable in restricted browser modes. */
        }
        const records = loadApplicantApplications();
        saveApplicantApplications(records.map((record) => record.id === applicationId ? {
          ...record,
          filter: 'in-progress',
          statusMessage: 'Your request to update the interview schedule is awaiting confirmation.',
          nextStep: 'No action is needed while the interview team reviews your requested availability.',
          deadline: undefined,
          primaryAction: 'await-interview-confirmation',
          interviewState: 'time-change-requested',
          updatedAt: '21 Aug 2026',
          interviewDetails: {
            card: 'rescheduling',
            selectedDate: 'Alternative availability shared',
            selectedTime: 'Pending confirmation',
            timezone: 'Singapore Time (SGT)',
            mentor: 'Aisha Rahman',
            mentorRole: 'Digital Hub',
            format: 'Online interview',
            location: 'Microsoft Teams',
            duration: '1 hour',
            originalDate: '27, 28 or 31 Aug 2026',
            originalTime: 'Timeslots offered in the invitation',
            requestStatus: 'Awaiting interview team confirmation',
            availabilityNote: result.data,
          },
          timeline: [
            {
              title: 'Interview time change requested',
              description: 'You shared alternative availability with the interview team.',
              date: '21 Aug 2026',
              tone: 'current',
            },
            ...record.timeline,
          ],
        } : record));
        router.push(`/apply/applicant-interview-confirmation?request=alternate&applicationId=${applicationId}`);
        return;
      }
      if (!interviewSlotSchema.safeParse(selectedInterviewSlot).success) return;
      const selectedSlot = INTERVIEW_SLOTS.find((slot) => slot.id === selectedInterviewSlot);
      if (selectedSlot) {
        confirmApplicantMentorInterview({
          id: selectedSlot.id,
          dateLabel: selectedSlot.date,
          timeLabel: selectedSlot.time,
          displayDateTime: `${selectedSlot.date} at ${selectedSlot.time} SGT`,
        });
      }
      router.push(`/apply/applicant-interview-confirmation?applicationId=${applicationId}`);
      return;
    }
    if (isCertificate) {
      downloadCertificate();
      setConfirmed(true);
      return;
    }
    if (isLinkedIn && !confirmed) {
      setConfirmed(true);
      return;
    }
    if (pageId === 'applicant-offer-confirmation' && decision === 'rejected') {
      router.push('/apply/applications/app-ui-2027');
      return;
    }
    if (isAlternativeInterviewRequest) {
      router.push('/apply/interviews');
      return;
    }
    router.push(config.primaryRoute);
  }

  return (
    <Shell activeRoute={config.activeRoute} flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg-subtle">
        <div className="bg-bg px-[clamp(24px,2.6vw,40px)] py-10">
          <div className="mx-auto w-full max-w-[1440px]">
            <button
              type="button"
              onClick={() => router.push(config.backRoute)}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-fg-muted transition-colors hover:text-fg"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {config.backLabel}
            </button>

            <header className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">{effectiveEyebrow}</p>
                <h1 className="mt-2 text-[34px] font-semibold leading-[42px] tracking-[-0.6px] text-fg">{effectiveTitle}</h1>
                <p className="mt-3 max-w-2xl text-[15px] leading-6 text-fg-muted">{effectiveDescription}</p>
              </div>
              {effectiveStatus ? <Badge variant={config.statusTone ?? 'subtle'} className="whitespace-nowrap">{formatStatusLabel(effectiveStatus)}</Badge> : null}
            </header>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-8">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.8fr)]">
            <div className="space-y-5">
              {isCertificate ? (
                <Card className="overflow-hidden border-accent/30 shadow-none">
                  <div className="h-1 bg-accent" aria-hidden />
                  <CardContent className="p-8 md:p-12">
                    <div className="mx-auto max-w-2xl border border-border bg-bg px-8 py-10 text-center shadow-sm">
                      <ShieldCheck className="mx-auto size-10 text-accent" aria-hidden />
                      <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Defence Science and Technology Agency</p>
                      <h2 className="mt-5 text-[28px] font-semibold text-fg">Certificate of Completion</h2>
                      <p className="mt-5 text-[14px] leading-6 text-fg-muted">This certifies that</p>
                      <p className="mt-2 text-[24px] font-semibold text-fg">Jenny Aw</p>
                      <p className="mx-auto mt-4 max-w-lg text-[14px] leading-6 text-fg-muted">successfully completed the University Internship 2026 programme on the Cybersecurity Threat Analysis project.</p>
                      <div className="mt-8 border-t border-border pt-5 text-[12px] text-fg-muted">23 Jun – 19 Sep 2026 · DSTA-INT-2026-00418</div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-[19px]">{isAlternativeInterviewRequest ? 'Interview schedule update' : isInterviewReview ? 'Interview invitation' : isRequirement ? 'Requirement information' : isReject ? 'Decision details' : isTestimonial ? 'Request details' : isLinkedIn ? 'Suggested post' : 'Review details'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isAlternativeInterviewRequest ? (
                      <div>
                        <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-muted p-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex gap-3">
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-success">
                              <CheckCircle2 className="size-5" aria-hidden />
                            </span>
                            <div>
                              <p className="text-[15px] font-medium text-fg">Request submitted</p>
                              <p className="mt-1 text-[13px] leading-5 text-fg-muted">The interview team has received your alternative availability.</p>
                            </div>
                          </div>
                          <Badge variant="info">Awaiting confirmation</Badge>
                        </div>

                        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                          <div className="border-b border-border pb-4 sm:col-span-2">
                            <dt className="text-[12px] leading-5 text-fg-muted">Requested availability</dt>
                            <dd className="mt-1 whitespace-pre-wrap text-[14px] font-medium leading-6 text-fg">{submittedAlternativeAvailability || 'Availability shared with the interview team.'}</dd>
                          </div>
                          <div className="border-b border-border pb-4">
                            <dt className="text-[12px] leading-5 text-fg-muted">Submitted</dt>
                            <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">21 Aug 2026 · 10:42 AM SGT</dd>
                          </div>
                          <div className="border-b border-border pb-4">
                            <dt className="text-[12px] leading-5 text-fg-muted">Request status</dt>
                            <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">Awaiting interview team confirmation</dd>
                          </div>
                          <div className="border-b border-border pb-4">
                            <dt className="text-[12px] leading-5 text-fg-muted">Original invitation</dt>
                            <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">3 proposed timeslots · 27, 28 and 31 Aug 2026</dd>
                          </div>
                          <div className="border-b border-border pb-4">
                            <dt className="text-[12px] leading-5 text-fg-muted">Mentor</dt>
                            <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">Aisha Rahman · Digital Hub</dd>
                          </div>
                        </dl>
                      </div>
                    ) : isInterviewReview ? (
                      <div>
                        <div className="grid gap-5 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-muted text-[13px] font-medium text-fg">MT</span>
                            <div>
                              <p className="text-[14px] font-medium text-fg">Marcus Tan</p>
                              <p className="mt-1 text-[13px] text-fg-muted">Mentor · Digital Hub</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-5 text-left sm:text-right">
                            <div><p className="text-[11px] text-fg-muted">Format</p><p className="mt-1 text-[13px] font-medium text-fg">Microsoft Teams</p></div>
                            <div><p className="text-[11px] text-fg-muted">Duration</p><p className="mt-1 text-[13px] font-medium text-fg">1 hour</p></div>
                            <div><p className="text-[11px] text-fg-muted">Respond by</p><p className="mt-1 text-[13px] font-medium text-warning">28 Aug 2026</p></div>
                          </div>
                        </div>

                        <RadioGroup
                          className="mt-6 gap-3"
                          value={selectedInterviewSlot}
                          onValueChange={(value) => {
                            if (typeof value !== 'string') return;
                            setSelectedInterviewSlot(value);
                            setRequestingAlternative(false);
                            setAlternativeError('');
                          }}
                        >
                          <p className="text-[14px] font-medium text-fg">Available timeslots</p>
                          {INTERVIEW_SLOTS.map((slot) => {
                            const selected = selectedInterviewSlot === slot.id && !requestingAlternative;
                            return (
                              <label
                                key={slot.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-4 rounded-lg border px-4 py-3 transition-colors',
                                  selected ? 'border-accent bg-accent/5' : 'border-border bg-bg hover:bg-bg-muted',
                                )}
                              >
                                <CalendarDays className="size-5 shrink-0 text-fg-muted" aria-hidden />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[14px] font-medium text-fg">{slot.date}</span>
                                  <span className="mt-1 block text-[13px] text-fg-muted">{slot.time} · Singapore Time (SGT)</span>
                                </span>
                                <RadioGroupItem value={slot.id} className="size-5" />
                              </label>
                            );
                          })}
                        </RadioGroup>

                        <div className="mt-5 border-t border-border pt-5">
                          {!requestingAlternative ? (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setRequestingAlternative(true);
                                setSelectedInterviewSlot('');
                              }}
                            >
                              None of these times work
                            </Button>
                          ) : (
                            <div className="rounded-lg border border-border bg-bg p-5">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex gap-3">
                                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-bg-muted text-accent">
                                    <Clock3 className="size-4" aria-hidden />
                                  </span>
                                  <div>
                                    <p className="text-[14px] font-medium text-fg">Request another time</p>
                                  <p className="mt-1 text-[13px] leading-5 text-fg-muted">Tell the interview team which dates and time ranges work for you.</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setRequestingAlternative(false); setAlternativeError(''); }}>Choose a listed timeslot</Button>
                              </div>
                              <Field className="mt-5" invalid={Boolean(alternativeError)}>
                                <FieldLabel>
                                  Your availability <span className="text-danger">*</span>
                                </FieldLabel>
                                <Textarea
                                  className="mt-2 min-h-28"
                                  value={alternativeAvailability}
                                  onChange={(event) => {
                                    setAlternativeAvailability(event.target.value);
                                    setAlternativeError('');
                                  }}
                                  placeholder="For example: I am available on 1-3 Sep after 2:00 PM, or any time on 4 Sep."
                                  maxLength={500}
                                  aria-label="Your availability"
                                  aria-invalid={Boolean(alternativeError)}
                                  aria-describedby={alternativeError ? 'alternative-availability-error' : 'alternative-availability-help'}
                                />
                                <div className="mt-2 flex items-start justify-between gap-4">
                                  {alternativeError ? (
                                    <FieldError id="alternative-availability-error">{alternativeError}</FieldError>
                                  ) : (
                                    <FieldDescription id="alternative-availability-help">Include at least one date and a preferred time range.</FieldDescription>
                                  )}
                                  <span className="shrink-0 text-[12px] text-fg-muted">{alternativeAvailability.length}/500</span>
                                </div>
                              </Field>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : isRequirement ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="text-[13px] font-medium text-fg">Emergency contact name<Input className="mt-2" value={contactName} onChange={(event) => setContactName(event.target.value)} /></label>
                        <label className="text-[13px] font-medium text-fg">Mobile number<Input className="mt-2" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /></label>
                        <label className="sm:col-span-2 text-[13px] font-medium text-fg">Relationship<Input className="mt-2" defaultValue="Parent" /></label>
                      </div>
                    ) : isReject ? (
                      <div className="space-y-5">
                        <label className="block text-[13px] font-medium text-fg">Reason for declining<Input className="mt-2" defaultValue="Accepted another opportunity" /></label>
                        <label className="block text-[13px] font-medium text-fg">Remarks <span className="font-normal text-fg-muted">(optional)</span><Textarea className="mt-2 min-h-28" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add any context you would like to share." /></label>
                      </div>
                    ) : isTestimonial ? (
                      <div className="space-y-5">
                        <label className="block text-[13px] font-medium text-fg">How will you use the testimonial?<Input className="mt-2" defaultValue="Graduate job applications" /></label>
                        <label className="block text-[13px] font-medium text-fg">What would you like your mentor to highlight?<Textarea className="mt-2 min-h-32" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="For example, project contribution, technical skills or teamwork." /></label>
                      </div>
                    ) : isLinkedIn ? (
                      <label className="block text-[13px] font-medium text-fg">Post content<Textarea className="mt-2 min-h-48" defaultValue="I’m grateful to have completed my University Internship 2026 with DSTA, where I contributed to the Cybersecurity Threat Analysis project. Thank you to my mentor and the Digital Hub team for the guidance and learning experience." /></label>
                    ) : (
                      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                        {effectiveDetails.map((detail) => (
                          <div key={detail.label} className="border-b border-border pb-4 last:border-b-0 sm:last:border-b">
                            <dt className="text-[12px] leading-5 text-fg-muted">{detail.label}</dt>
                            <dd className="mt-1 text-[14px] font-medium leading-5 text-fg">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {config.checklist && !isOffboarding ? (
                      <div className="mt-6 border-t border-border pt-5">
                        <p className="text-[13px] font-medium text-fg">Before you continue</p>
                        <div className="mt-3 space-y-3">
                          {config.checklist.map((item, index) => (
                            <label key={item} className="flex items-start gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-[14px] text-fg">
                              <Checkbox checked={!!checks[index]} onCheckedChange={(value) => setChecks((current) => ({ ...current, [index]: value === true }))} />
                              <span>{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {effectiveNotice ? (
                <Alert variant={config.statusTone === 'warning' ? 'warning' : config.statusTone === 'success' ? 'success' : 'info'}>
                  <Info aria-hidden />
                  <AlertDescription>{effectiveNotice}</AlertDescription>
                </Alert>
              ) : null}

              {isOffboarding ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="shadow-none">
                    <CardContent className="flex h-full flex-col p-5">
                      <MessageSquareHeart className="size-5 text-accent" aria-hidden />
                      <h2 className="mt-4 text-[16px] font-semibold text-fg">Internship feedback</h2>
                      <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Required to complete offboarding and unlock certificate eligibility.</p>
                      <Button className="mt-5" onClick={() => router.push('/apply/feedback/APP-0031')}>Start Feedback</Button>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none">
                    <CardContent className="flex h-full flex-col p-5">
                      <Quote className="size-5 text-accent" aria-hidden />
                      <h2 className="mt-4 text-[16px] font-semibold text-fg">Request testimonial</h2>
                      <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Ask your mentor for a testimonial to support future applications.</p>
                      <Button className="mt-5" variant="outline" onClick={() => router.push('/apply/applicant-testimonial-request')}>Request Testimonial</Button>
                    </CardContent>
                  </Card>
                  <Card className="shadow-none">
                    <CardContent className="flex h-full flex-col p-5">
                      <Share2 className="size-5 text-accent" aria-hidden />
                      <h2 className="mt-4 text-[16px] font-semibold text-fg">Share your experience</h2>
                      <p className="mt-2 flex-1 text-[13px] leading-5 text-fg-muted">Prepare editable content before continuing to LinkedIn.</p>
                      <Button className="mt-5" variant="outline" onClick={() => router.push('/apply/applicant-linkedin-share')}>Prepare LinkedIn Post</Button>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {isLinkedIn && confirmed ? (
                <Alert variant="warning">
                  <Info aria-hidden />
                  <AlertDescription>You are leaving TOA. The suggested text will not be published automatically. Review it again on LinkedIn before posting.</AlertDescription>
                </Alert>
              ) : null}

              {confirmed && isCertificate ? (
                <Alert variant="success"><CheckCircle2 aria-hidden /><AlertDescription>Your certificate download has started.</AlertDescription></Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                {!isOffboarding ? (
                  <Button onClick={continueFlow} disabled={primaryDisabled}>
                    {isCertificate ? <Download className="size-4" aria-hidden /> : null}
                    {isLinkedIn && confirmed ? 'Return to Offboarding' : effectivePrimaryLabel}
                    {!isCertificate ? <ArrowRight className="size-4" aria-hidden /> : null}
                  </Button>
                ) : null}
                {!isInterviewReview && effectiveSecondaryLabel && effectiveSecondaryRoute ? (
                  <Button variant="outline" onClick={() => router.push(effectiveSecondaryRoute)}>{effectiveSecondaryLabel}</Button>
                ) : null}
              </div>
            </div>

            <aside className="space-y-5">
              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[17px]">Record context</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex gap-3"><FileCheck2 className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Programme</dt><dd className="mt-1 text-[14px] font-medium text-fg">{isInterviewReview || isInterviewConfirmation || isOfferWorkflow ? 'University Internship 2027' : 'Undergraduate Internship 2027'}</dd></div></div>
                    <div className="flex gap-3"><UserRound className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Applicant</dt><dd className="mt-1 text-[14px] font-medium text-fg">Jenny Aw</dd></div></div>
                    <div className="flex gap-3"><CalendarDays className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden /><div><dt className="text-[12px] text-fg-muted">Last updated</dt><dd className="mt-1 text-[14px] font-medium text-fg">{isOfferWorkflow ? '29 Aug 2026' : '21 Aug 2026'}</dd></div></div>
                  </dl>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader><CardTitle className="text-[17px]">What happens next</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <p className="text-[14px] leading-6 text-fg-muted">{isInterviewReview ? 'Choose a listed timeslot to confirm it immediately. You will receive a confirmation email and portal notification.' : isAlternativeInterviewRequest ? 'The interview team will review your schedule update request and notify you when a new time is confirmed.' : isInterviewConfirmation ? 'Your interview is scheduled. Review the details in My Interviews and join Microsoft Teams 5 minutes early.' : 'Complete this step to update the relevant application or internship record. You can return through Home, the menu index or the record timeline.'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardContent className="flex items-start gap-3 p-5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
                  <div><p className="text-[14px] font-medium text-fg">Need help?</p><a className="mt-1 block text-[13px] text-accent hover:underline" href="mailto:internships@dsta.gov.sg">internships@dsta.gov.sg</a></div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </Shell>
  );
}
