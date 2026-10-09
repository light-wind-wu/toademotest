'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, GraduationCap, Info, UserRound } from 'lucide-react';
import { z } from 'zod';
import Shell from '@/components/layout/shell';
import { ApplicantEmptyState } from '@/components/ui-legacy/applicant-empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useApplicantScenarioData } from '@/lib/applicant-scenario-data';
import { APPLICANT_INTERVIEW_CONFIRMED_EVENT, loadApplicantInterviewSelection, confirmApplicantMentorInterview } from '@/lib/applicant-mentor-interview';
import { APPLICANT_HOME_SCENARIO_CHANGED, saveApplicantHomeScenario } from '@/lib/applicant-home-scenario';
import { formatStatusLabel } from '@/lib/status-label';
import { cn } from '@/lib/utils';
import slots from '@/data/applicant-interview-slots.json';
import type { ApplicantScenarioInterviewRecord } from '@/lib/types';

const availabilityKey = 'dsta_interview_availability';
const responseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('slot'), slot: z.string().refine((value) => slots.some((slot) => slot.id === value), 'Choose an available timeslot.') }),
  z.object({ kind: z.literal('comments'), comments: z.string().trim().min(1, 'Please enter your availability.').max(1000, 'Use 1,000 characters or fewer.') }),
]);

function InterviewDetails({ record }: { record: ApplicantScenarioInterviewRecord }) {
  const router = useRouter();
  const [choice, setChoice] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const pending = record.status === 'AWAITING MENTOR CONFIRMATION';
  const completed = record.status === 'COMPLETED';
  const actionRequired = record.status === 'ACTION REQUIRED';

  function submitResponse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitted) return;
    const result = responseSchema.safeParse(choice === 'comments' ? { kind: 'comments', comments } : { kind: 'slot', slot: choice });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError('');
    if (result.data.kind === 'comments') {
      try {
        localStorage.setItem(availabilityKey, result.data.comments);
      } catch {
        setError('Your comments could not be saved. Please try again.');
        return;
      }
      setSubmitted(true);
      saveApplicantHomeScenario('interview-rescheduling');
    } else {
      const slot = slots.find((item) => item.id === choice);
      if (slot) {
        confirmApplicantMentorInterview(slot);
        setSubmitted(true);
      }
    }
  }

  return (
    <article aria-label={`${record.project} interview details`}>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2.18fr)_minmax(280px,1fr)]">
        <div className="min-w-0">
          <div className="rounded-lg border border-border bg-surface p-6">
      <header className="mb-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold text-fg">{actionRequired ? 'Choose an interview timeslot' : record.project}</h3>
          <Badge variant={actionRequired ? 'warning' : pending ? 'info' : completed ? 'subtle' : 'success'}>{actionRequired ? 'Interview invited' : formatStatusLabel(record.status)}</Badge>
          </div>
          <Card className="mt-3 shadow-none" aria-label="Interview project">
            <CardContent className="space-y-1.5 px-6 py-4">
              <p className="text-sm leading-5 text-fg-muted">Project</p>
              <h4 className="break-words text-base font-bold leading-[18px] text-fg">{record.project}</h4>
              <p className="break-words text-sm leading-5 text-fg-muted">{record.interviewId}</p>
            </CardContent>
          </Card>
          <p className="mt-2 text-sm text-fg-muted">{actionRequired ? 'Select an available time, or request another time if none of the suggested slots work for you.' : 'University Internship 2027'}</p>
        </div>
      </header>
          <h4 className="text-base font-semibold text-fg">{actionRequired ? 'Interview with your mentor' : pending ? 'Your request is under review' : completed ? 'Interview completed' : 'Your interview is confirmed'}</h4>
          {actionRequired ? <div className="mt-5 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-bg-muted text-sm font-medium text-fg-muted" aria-hidden>MT</span><div><p className="text-sm font-medium">Marcus Tan</p><p className="mt-1 text-xs text-fg-muted">Mentor · Digital Hub</p></div></div> : <p className="mt-2 text-sm leading-6 text-fg-muted">{record.statusMessage}</p>}
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:divide-x sm:divide-border">
            <div><dt className="text-sm text-fg-muted">Format</dt><dd className="mt-1 text-sm font-medium">Microsoft Teams</dd></div>
            <div className="sm:pl-5"><dt className="text-sm text-fg-muted">Duration</dt><dd className="mt-1 text-sm font-medium">1 hour</dd></div>
            {actionRequired ? <div className="sm:pl-5"><dt className="text-sm text-fg-muted">Respond by</dt><dd className="mt-1 text-sm font-medium text-warning">{record.respondBy}</dd></div> : null}
          </dl>
          {actionRequired ? (
            <form id={`response-${record.interviewId}`} onSubmit={submitResponse} className="mt-6">
              <p className="mb-3 text-sm text-fg-muted">Available time <span className="text-xs">(SGT)</span></p>
              <RadioGroup aria-label="Choose an interview timeslot" value={choice === 'comments' ? '' : choice} onValueChange={(value) => { setChoice(String(value)); setError(''); }} className="grid gap-3 sm:grid-cols-2">
                {slots.map((slot) => (
                  <label key={slot.id} className={cn('flex min-h-20 cursor-pointer items-center justify-between gap-4 rounded-lg border p-5', choice === slot.id ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong')}>
                    <span><span className="block text-sm font-semibold text-fg">{slot.dateLabel}</span><span className="mt-1 block text-sm text-fg-muted">{slot.timeLabel}</span></span>
                    <RadioGroupItem value={slot.id} aria-label={`${slot.dateLabel}, ${slot.timeLabel}, SGT`} />
                  </label>
                ))}
              </RadioGroup>
              <Button type="button" variant="outline" className="mt-5" aria-expanded={choice === 'comments'} aria-controls={`availability-panel-${record.interviewId}`} onClick={() => { setChoice(choice === 'comments' ? '' : 'comments'); setError(''); }}>Request another timeslot</Button>
              {choice === 'comments' ? (
                <div id={`availability-panel-${record.interviewId}`} className="mt-4">
                  <label htmlFor={`availability-${record.interviewId}`} className="text-sm font-medium">Your availability <span className="text-danger">*</span></label>
                  <Textarea id={`availability-${record.interviewId}`} value={comments} onChange={(event) => setComments(event.target.value)} maxLength={1000} className="mt-2 min-h-28" placeholder="Tell us which dates and time ranges work for you." aria-describedby={error ? `error-${record.interviewId}` : undefined} aria-invalid={Boolean(error)} />
                  <p className="mt-2 text-xs text-fg-muted">The interview team will review your comments. This does not confirm an interview.</p>
                </div>
              ) : null}
              {error ? <p id={`error-${record.interviewId}`} role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
            </form>
          ) : pending ? (
            <div role="status" className="mt-6 rounded-lg border border-border bg-bg-subtle p-5">
              <h4 className="text-sm font-semibold">Your comments</h4>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-fg-muted">{record.applicantAlternativeAvailability || 'Your request has been sent to the interview team.'}</p>
              <p className="mt-4 text-sm text-fg">Please wait for the team’s response. Your interview is not confirmed yet.</p>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-border bg-bg-subtle p-5">
              <p className="text-xs text-fg-muted">{completed ? 'Interview date' : 'Confirmed date and time'}</p>
              <p className="mt-2 text-lg font-semibold text-fg">{record.confirmedStart || 'Not recorded'}</p>
              <p className="mt-2 text-sm text-fg-muted">Singapore Time (SGT)</p>
              {!completed ? <p className="mt-4 text-sm leading-6 text-fg-muted">Join Microsoft Teams 5 minutes early. Check your camera, microphone and internet connection before the interview.</p> : null}
            </div>
          )}
          {!completed && !pending && !actionRequired ? <Button className="mt-5" onClick={() => router.push('/teams/interview/app-ui-2027')}>Join Microsoft Teams</Button> : null}
          </div>
          {actionRequired && <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning" role="note"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /><p>{choice === 'comments' ? 'Your request will be sent to the interview team for review. This does not confirm an interview.' : 'Confirming a listed timeslot schedules your interview immediately. We will send a confirmation email and portal notification.'}</p></div>}
        </div>
        <aside className="space-y-4" aria-label="Interview information">
          <Card className="shadow-none"><CardContent className="p-6">
          <h4 className="text-base font-semibold">Application details</h4>
          <dl className="mt-5 space-y-5">
            <div className="flex gap-3"><GraduationCap className="size-4 shrink-0 text-fg-muted" aria-hidden /><div><dt className="text-xs text-fg-muted">Programme</dt><dd className="mt-1 text-sm">University Internship 2027</dd></div></div>
            <div className="flex gap-3"><UserRound className="size-4 shrink-0 text-fg-muted" aria-hidden /><div><dt className="text-xs text-fg-muted">Applicant</dt><dd className="mt-1 text-sm">Jenny Aw</dd></div></div>
            <div className="flex gap-3"><CalendarDays className="size-4 shrink-0 text-fg-muted" aria-hidden /><div><dt className="text-xs text-fg-muted">Project</dt><dd className="mt-1 text-sm">{record.project}</dd></div></div>
          </dl>
          <Button variant="outline" className="mt-5" onClick={() => router.push('/apply/applications/app-ui-2027')}>View Application</Button>
          </CardContent></Card>
          <Card className="shadow-none"><CardContent className="p-6"><h4 className="text-base font-semibold">What happens next</h4><p className="mt-3 text-sm leading-6 text-fg-muted">{pending || choice === 'comments' ? 'The interview team will review your comments. Please wait for their response before making arrangements.' : actionRequired ? 'Choose a listed timeslot to confirm it immediately. You will receive a confirmation email and portal notification.' : completed ? 'Check your application for updates on the outcome.' : 'Prepare for your interview and join Microsoft Teams 5 minutes before the confirmed time.'}</p></CardContent></Card>
          <Card className="shadow-none"><CardContent className="p-6"><h4 className="text-base font-semibold">Need help?</h4><a className="mt-3 inline-block break-all text-sm text-accent underline-offset-4 hover:underline" href="mailto:internship@dsta.gov.sg">internship@dsta.gov.sg</a></CardContent></Card>
        </aside>
      </div>
      {actionRequired ? <footer className="sticky bottom-0 z-20 mt-6 flex items-center justify-between gap-4 border-t border-border bg-surface px-4 py-4 shadow-sm"><Button variant="outline" onClick={() => router.push('/apply/dashboard')}>Back</Button><Button type="submit" form={`response-${record.interviewId}`} disabled={submitted || !choice || (choice === 'comments' && !comments.trim())}>{choice === 'comments' ? 'Submit comments' : 'Confirm timeslot'}</Button></footer> : null}
    </article>
  );
}

export default function ApplyInterviews() {
  const { interviews: scenarioRecords } = useApplicantScenarioData();
  const [selectedSlot, setSelectedSlot] = useState(() => typeof window === 'undefined' ? null : loadApplicantInterviewSelection());
  const [savedComments, setSavedComments] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSelectedSlot(loadApplicantInterviewSelection());
      try { setSavedComments(localStorage.getItem(availabilityKey) || ''); } catch {}
    };
    refresh();
    window.addEventListener(APPLICANT_INTERVIEW_CONFIRMED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, refresh);
    return () => {
      window.removeEventListener(APPLICANT_INTERVIEW_CONFIRMED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, refresh);
    };
  }, []);

  const records = useMemo(() => scenarioRecords.map((record) => {
    if (record.status === 'AWAITING MENTOR CONFIRMATION' && savedComments) return { ...record, applicantAlternativeAvailability: savedComments };
    if (record.status !== 'CONFIRMED' || !selectedSlot) return record;
    return { ...record, confirmedStart: selectedSlot.displayDateTime, statusMessage: `Your mentor interview with Marcus Tan is confirmed for ${selectedSlot.displayDateTime}.` };
  }), [scenarioRecords, selectedSlot, savedComments]);
  const current = records.filter((record) => record.tabGroup !== 'past' && record.status !== 'COMPLETED');
  const past = records.filter((record) => record.tabGroup === 'past' || record.status === 'COMPLETED');
  const displayedTab = activeTab ?? (current.length ? 'current' : 'past');

  function details(items: ApplicantScenarioInterviewRecord[]) {
    return <div className="space-y-6">{items.map((record) => <InterviewDetails key={`${record.interviewId}-${record.status}`} record={record} />)}</div>;
  }

  return (
    <Shell activeRoute="/apply/interviews" flushTop>
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))] min-h-[calc(100vh-64px)] bg-bg">
        <div className="mx-auto w-full max-w-[1440px] px-[clamp(24px,2.6vw,40px)] py-6">
          <h1 className="mb-6 text-2xl font-semibold">My Interviews</h1>
          {records.length === 0 ? (
            <ApplicantEmptyState type="interviews" />
          ) : (
                <Tabs value={displayedTab} onValueChange={(value) => setActiveTab(String(value))}>
                  <TabsList aria-label="Interview history" className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0"><TabsTrigger value="current" className="rounded-none border-b-2 border-transparent px-3 py-4 data-[active]:border-accent data-[active]:bg-transparent data-[active]:shadow-none">In progress ({current.length})</TabsTrigger><TabsTrigger value="past" className="rounded-none border-b-2 border-transparent px-3 py-4 data-[active]:border-accent data-[active]:bg-transparent data-[active]:shadow-none">Completed ({past.length})</TabsTrigger></TabsList>
                  <TabsContent value="current" className="clear-both mt-6">{current.length ? details(current) : <p className="rounded-lg border border-border bg-surface p-6 text-sm text-fg-muted">No current interviews. View the Completed tab for your interview history.</p>}</TabsContent>
                  <TabsContent value="past" className="clear-both mt-6">{past.length ? details(past) : <p className="rounded-lg border border-border bg-surface p-6 text-sm text-fg-muted">Completed interviews will appear here.</p>}</TabsContent>
                </Tabs>
          )}
        </div>
      </div>
    </Shell>
  );
}
