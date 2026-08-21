'use client';

/* Apply Dashboard V1 — content max 1440; Part1 bg full-bleed of main column.
   Part1 hero sides fill; copy/art stay in 1440.
   Part2 status inset 24px: 335 | 60 | 1fr (Interview invited in normal flow).
   Part3 inset 24px: 1fr | 20 | 314 (fills width, right aligned).
   Map 143 | 40 | 1fr · Activity 676 | 16 | 270 */
import Image from 'next/image';
import { Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { PROJECT_MATCHES, resolveArchetype, archetypeResultImage } from '@/lib/apply-project-fit';
import { loadApplyDraft, programmeTitleForVariant } from '@/lib/apply-application';
import { loadUtApplicantVariant } from '@/lib/ut-track';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import InterviewTimeslotSheet from '@/components/apply/interview-timeslot-sheet';
import OutOfScopeTooltip from '@/components/apply/out-of-scope-tooltip';
import HeroRadarOverlay from '@/components/apply/hero-radar-overlay';
import {
  APPLICANT_HOME_SCENARIO_CHANGED,
  isApplicantHomeScenario,
  loadApplicantHomeScenario,
} from '@/lib/applicant-home-scenario';
import type {
  ApplicantHomeScenario,
  ApplicantHomeScenarioContent,
} from '@/lib/types';

const INTERVIEW_PROJECT_NAME = PROJECT_MATCHES[0].name;

const BASE_STEP_LABELS = ['Submitted', 'Under Review', 'Interview', 'Outcome'] as const;

const HOME_SCENARIO_CONTENT = {
  'no-application': {
    heroLines: ['Start your journey', 'with DSTA'],
    heroMessage: 'Explore internship programmes and discover opportunities that match your interests.',
    heroBadge: 'Applications open',
    bannerLines: ['Discover where', 'your strengths', 'can take you.'],
    bannerBody: 'Browse open programmes and begin an application when you are ready.',
    recordDate: 'Applications close 30 Sep 2026',
    statusLabel: 'Not started',
    summary: 'Undergraduate Internship 2027 is open for applications across cyber, digital and engineering teams.',
    dueText: 'Start any time before 30 Sep 2026.',
    primaryLabel: 'Explore Programmes',
    primaryRoute: '/apply/welcome',
    secondaryLabel: 'View Programme',
    progressIndex: -1,
    progressHint: 'Start an application',
    detailLabel: 'Getting started',
    detailTitle: 'Find a programme that fits your goals.',
    detailPerson: 'Talent Outreach Team',
    detailRole: 'DSTA Internships',
    detailMeta: [{ label: 'Application window', value: 'Open now' }, { label: 'Closes', value: '30 Sep 2026' }],
    tasksKicker: 'Take the first step',
    tasksTitle: 'Explore your options',
    tasksDeadline: 'Applications close 30 Sep 2026',
    tasks: [
      { title: 'Explore programmes', body: 'Compare internship pathways and eligibility.', cta: 'Explore' },
      { title: 'Discover your archetype', body: 'Find projects that match your interests.', cta: 'Take Quiz' },
    ],
    activity: [],
  },
  'draft-application': {
    heroLines: ['You have made', 'a good start'],
    heroMessage: 'Your draft is saved. Pick up where you left off and submit before the window closes.',
    heroBadge: 'Draft saved',
    bannerLines: ['Your application', 'is ready to', 'continue.'],
    bannerBody: 'Complete your project preferences and review your answers before submitting.',
    recordDate: 'Last updated 16 Aug 2026',
    statusLabel: 'Draft',
    summary: 'Your profile and education details are saved for Undergraduate Internship 2027.',
    dueText: 'Submit by 30 Sep 2026.',
    primaryLabel: 'Resume Application',
    primaryRoute: '/apply/review',
    secondaryLabel: 'View Draft',
    progressIndex: -1,
    progressHint: 'Draft application',
    detailLabel: 'Draft application',
    detailTitle: 'Complete your application before submitting.',
    detailPerson: 'Jenny Aw',
    detailRole: 'Applicant profile',
    detailMeta: [{ label: 'Progress', value: '4 of 6 sections' }, { label: 'Time remaining', value: 'About 8 minutes' }],
    tasksKicker: 'Keep things moving',
    tasksTitle: '2 sections need your attention',
    tasksDeadline: 'Submit by 30 Sep 2026',
    tasks: [
      { title: 'Rank project preferences', body: 'Choose and rank up to five projects.', cta: 'Continue' },
      { title: 'Review your application', body: 'Check your details before submission.', cta: 'Review' },
    ],
    activity: [
      { title: 'Draft saved', body: 'Your latest changes have been stored.', date: '16 Aug 2026', tone: 'accent' },
      { title: 'Profile details completed', body: 'Your personal details are ready for review.', date: '15 Aug 2026', tone: 'accent' },
      { title: 'Application window reminder', body: 'Submit by 30 September 2026.', date: '15 Aug 2026', tone: 'warning' },
    ],
  },
  'under-review': {
    heroLines: ['Your application is', 'moving forward'],
    heroMessage: 'The review team has everything they need. We will let you know when there is an update.',
    heroBadge: 'Under review',
    bannerLines: ['Your application', 'is now under', 'review.'],
    bannerBody: 'No action is needed while we review your application and suitable project matches.',
    recordDate: 'Submitted 24 Jul 2026',
    statusLabel: 'Under review',
    summary: 'Your Undergraduate Internship 2027 application is being reviewed for suitable project matches.',
    dueText: 'No action is required right now.',
    primaryLabel: 'View Application',
    primaryRoute: '/apply/applications',
    secondaryLabel: 'View Details',
    progressIndex: 1,
    progressHint: 'Application review',
    detailLabel: 'Application review',
    detailTitle: 'Your application is with our review team.',
    detailPerson: 'Talent Outreach Team',
    detailRole: 'Application review',
    detailMeta: [{ label: 'Status', value: 'Under review' }, { label: 'Submitted', value: '24 Jul 2026' }],
    tasksKicker: 'You are all caught up',
    tasksTitle: 'No tasks need your attention',
    tasksDeadline: 'We will notify you of any updates',
    tasks: [
      { title: 'Keep your profile current', body: 'Check that your contact details are up to date.', cta: 'View Profile' },
      { title: 'Explore DSTA events', body: 'Discover upcoming talks and experiences.', cta: 'View Events' },
    ],
    activity: [
      { title: 'Application under review', body: 'Your application has moved to the review stage.', date: '25 Jul 2026', tone: 'accent' },
      { title: 'Application received', body: 'Your Undergraduate Internship 2027 submission is complete.', date: '24 Jul 2026', tone: 'accent' },
      { title: 'Quiz result saved', body: 'Your archetype can be replayed any time.', date: '24 Jul 2026', tone: 'warning' },
    ],
  },
  'interview-action': {
    heroLines: ['Your next chapter is', 'taking shape'],
    heroMessage: 'You’ve received an interview invitation. Choose a timeslot to continue.',
    heroBadge: 'Interview invitation received',
    bannerLines: ['Congratulations! You', 'have been shortlisted', 'for an interview.'],
    bannerBody: 'The hiring mentor Aisha Rahman (Digital Hub) would like to have a chat with you before making a final decision.',
    recordDate: 'Submitted 24 Jul 2026',
    statusLabel: 'Interview invited',
    summary: `You’ve been shortlisted for an interview for the ${INTERVIEW_PROJECT_NAME} project under Undergraduate Internship 2027.`,
    dueText: 'Choose a timeslot by 30 Jul 2026.',
    primaryLabel: 'Choose a Timeslot',
    primaryRoute: '/apply/interviews',
    secondaryLabel: 'View Application',
    progressIndex: 2,
    progressHint: 'Choose a timeslot',
    detailLabel: 'Interview invitation',
    detailTitle: 'Choose a timeslot to confirm your interview.',
    detailPerson: 'Aisha Rahman',
    detailRole: 'Mentor · Digital Hub',
    detailMeta: [{ label: 'Format', value: 'Microsoft Teams' }, { label: 'Duration', value: '30 minutes' }],
    tasksKicker: 'Keep things moving',
    tasksTitle: '2 tasks need your attention',
    tasksDeadline: 'Respond by 30 Aug 2026',
    tasks: [
      { title: 'Update your contact details', body: 'Add a current email address and mobile number.', cta: 'Update Details' },
      { title: 'Provide additional information', body: 'The review team has requested additional information.', cta: 'View Request' },
    ],
    activity: [
      { title: 'Interview invitation received', body: `Aisha Rahman invited you to interview for ${INTERVIEW_PROJECT_NAME}.`, date: '26 Jul 2026', tone: 'accent' },
      { title: 'Application received', body: 'Your Undergraduate Internship 2027 submission is complete.', date: '24 Jul 2026', tone: 'accent' },
      { title: 'Quiz result saved', body: 'Your Pioneer archetype can be replayed without changing your application.', date: '24 Jul 2026', tone: 'warning' },
    ],
  },
  'interview-scheduled': {
    heroLines: ['Your interview is', 'on the calendar'],
    heroMessage: 'Your timeslot is selected. Review the details and get ready to meet your mentor.',
    heroBadge: 'Interview scheduled',
    bannerLines: ['Your interview', 'timeslot is', 'confirmed.'],
    bannerBody: 'Everything you need for the conversation is available below. You can manage the interview if your availability changes.',
    recordDate: 'Timeslot selected 19 Aug 2026',
    statusLabel: 'Timeslot selected',
    summary: `Your interview for the ${INTERVIEW_PROJECT_NAME} project is scheduled with Aisha Rahman.`,
    dueText: '27 Aug 2026 · 2:30 PM · Singapore Time (SGT)',
    primaryLabel: 'View / Manage Interview',
    primaryRoute: '/apply/applications/app-design-2027',
    secondaryLabel: 'View Application',
    progressIndex: 2,
    progressHint: 'Timeslot Selected',
    detailLabel: 'Interview Scheduled',
    detailTitle: 'Your interview timeslot is confirmed.',
    detailPerson: 'Aisha Rahman',
    detailRole: 'Mentor · Digital Hub',
    detailMeta: [{ label: 'Selected date & time', value: '27 Aug 2026 · 2:30 PM' }, { label: 'Interview details', value: 'Microsoft Teams · 45 minutes' }],
    tasksKicker: 'Interview details',
    tasksTitle: 'Everything you need for the conversation',
    tasksDeadline: '27 Aug 2026 · 2:30 PM SGT',
    tasks: [
      { title: 'View interview details', body: 'Review the mentor, format and joining instructions.', cta: 'View Details' },
      { title: 'Suggest another time', body: 'Request a different time if your availability changes.', cta: 'Suggest Time' },
    ],
    activity: [],
  },
  'interview-rescheduling': {
    heroLines: ['Your time change is', 'being reviewed'],
    heroMessage: 'Your suggested interview time has been sent. No action is needed while we confirm it.',
    heroBadge: 'Time change requested',
    bannerLines: ['Your alternative', 'interview time is', 'pending.'],
    bannerBody: 'The interviewer is reviewing your suggested time. We will notify you as soon as it is confirmed.',
    recordDate: 'Time change requested 20 Aug 2026',
    statusLabel: 'Awaiting confirmation',
    summary: `Your request to reschedule the ${INTERVIEW_PROJECT_NAME} interview is awaiting confirmation from your mentor.`,
    dueText: 'No action is needed while this request is pending.',
    primaryLabel: 'Await Interview Time Confirmation',
    primaryRoute: '/apply/applications/app-ai-2027',
    secondaryLabel: 'View Application',
    progressIndex: 2,
    progressHint: 'Time Change Requested',
    detailLabel: 'Interview Rescheduling',
    detailTitle: 'Your suggested time is awaiting confirmation.',
    detailPerson: 'Aisha Rahman',
    detailRole: 'Mentor · Digital Hub',
    detailMeta: [{ label: 'Suggested date & time', value: '31 Aug 2026 · 11:00 AM' }, { label: 'Request status', value: 'Awaiting interviewer confirmation' }],
    tasksKicker: 'Rescheduling details',
    tasksTitle: 'No action is needed right now',
    tasksDeadline: 'We will notify you when the time is confirmed',
    tasks: [
      { title: 'Suggested time', body: '31 Aug 2026 · 11:00 AM SGT', cta: 'View Details' },
      { title: 'Original slot', body: '28 Aug 2026 · 3:00 PM SGT', cta: 'View Original' },
    ],
    activity: [],
  },
  'offer-action': {
    heroLines: ['An offer is waiting', 'for you'],
    heroMessage: 'Review your internship offer and tell us your decision before the response deadline.',
    heroBadge: 'Offer received',
    bannerLines: ['Your internship', 'offer is ready', 'to review.'],
    bannerBody: 'Review the internship period, reporting details and terms before responding.',
    recordDate: 'Offer issued 29 Aug 2026',
    statusLabel: 'Offer received',
    summary: `You have received an offer for the ${INTERVIEW_PROJECT_NAME} project under Undergraduate Internship 2027.`,
    dueText: 'Respond by 5 Sep 2026.',
    primaryLabel: 'View Offer',
    primaryRoute: '/apply/applicant-offer-detail?applicationId=app-ui-2027',
    secondaryLabel: 'View Application',
    progressIndex: 3,
    progressHint: 'Respond to your offer',
    detailLabel: 'Offer received',
    detailTitle: 'Review and respond to your internship offer.',
    detailPerson: 'Aisha Rahman',
    detailRole: 'Mentor · Digital Hub',
    detailMeta: [{ label: 'Internship period', value: '14 Sep – 11 Dec 2026' }, { label: 'Response deadline', value: '5 Sep 2026' }],
    tasksKicker: 'Offer response',
    tasksTitle: '2 details to review',
    tasksDeadline: 'Respond by 5 Sep 2026',
    tasks: [
      { title: 'Review your offer', body: 'Check the period, location and terms.', cta: 'View Offer' },
      { title: 'Confirm your decision', body: 'Accept or decline before the deadline.', cta: 'Respond' },
    ],
    activity: [
      { title: 'Offer received', body: 'Your internship offer is ready to review.', date: '29 Aug 2026', tone: 'accent' },
      { title: 'Interview completed', body: 'Thank you for meeting the project team.', date: '28 Aug 2026', tone: 'accent' },
      { title: 'Response deadline', body: 'Respond to your offer by 5 September 2026.', date: '29 Aug 2026', tone: 'warning' },
    ],
  },
  'onboarding-action': {
    heroLines: ['Let’s get you ready', 'for day one'],
    heroMessage: 'Your place is confirmed. Complete the remaining onboarding tasks before your internship begins.',
    heroBadge: 'Offer accepted',
    bannerLines: ['Welcome aboard.', 'Your internship', 'is confirmed.'],
    bannerBody: 'Complete your onboarding checklist and review your first-day information.',
    recordDate: 'Offer accepted 31 Aug 2026',
    statusLabel: 'Onboarding',
    summary: `Your place on the ${INTERVIEW_PROJECT_NAME} project is confirmed. Three onboarding tasks remain.`,
    dueText: 'Complete onboarding by 15 Sep 2026.',
    primaryLabel: 'Continue Onboarding',
    primaryRoute: '/apply/onboarding',
    secondaryLabel: 'View Internship',
    progressIndex: 3,
    progressHint: 'Complete onboarding',
    detailLabel: 'Onboarding checklist',
    detailTitle: 'Complete your remaining onboarding tasks.',
    detailPerson: 'Aisha Rahman',
    detailRole: 'Mentor · Digital Hub',
    detailMeta: [{ label: 'Progress', value: '3 of 6 tasks' }, { label: 'Due', value: '15 Sep 2026' }],
    tasksKicker: 'Before day one',
    tasksTitle: '2 tasks need your attention',
    tasksDeadline: 'Complete by 15 Sep 2026',
    tasks: [
      { title: 'Provide bank details', body: 'Add your account and supporting document.', cta: 'Continue' },
      { title: 'Accept use policy', body: 'Read and acknowledge the policy.', cta: 'Review' },
    ],
    activity: [
      { title: 'Onboarding tasks created', body: 'Complete your checklist before your first day.', date: '31 Aug 2026', tone: 'accent' },
      { title: 'Welcome letter available', body: 'Your first-day information is ready.', date: '31 Aug 2026', tone: 'accent' },
      { title: 'Offer accepted', body: 'Your response was submitted successfully.', date: '31 Aug 2026', tone: 'accent' },
    ],
  },
  'active-internship': {
    heroLines: ['You are building', 'what comes next'],
    heroMessage: 'Stay on top of your internship details, key contacts and upcoming milestones.',
    heroBadge: 'Week 5 of 12',
    bannerLines: ['Your internship', 'is in progress', 'and on track.'],
    bannerBody: 'Your next milestone is the mid-point check-in with your mentor.',
    recordDate: 'Started 14 Sep 2026',
    statusLabel: 'Active internship',
    summary: `You are completing the ${INTERVIEW_PROJECT_NAME} project with Digital Hub.`,
    dueText: 'Next check-in on 16 Oct 2026.',
    primaryLabel: 'View Internship',
    primaryRoute: '/apply/internship',
    secondaryLabel: 'View Details',
    progressIndex: 3,
    progressHint: 'Internship in progress',
    detailLabel: 'Active internship',
    detailTitle: 'Your internship is on track.',
    detailPerson: 'Aisha Rahman',
    detailRole: 'Mentor · Digital Hub',
    detailMeta: [{ label: 'Progress', value: 'Week 5 of 12' }, { label: 'Next check-in', value: '16 Oct 2026' }],
    tasksKicker: 'You are all caught up',
    tasksTitle: 'No tasks need your attention',
    tasksDeadline: 'Next check-in 16 Oct 2026',
    tasks: [
      { title: 'View internship details', body: 'Check your period, mentor and contacts.', cta: 'View Details' },
      { title: 'Prepare for check-in', body: 'Review your progress with your mentor.', cta: 'View Guide' },
    ],
    activity: [
      { title: 'Mid-point check-in scheduled', body: 'Meet Aisha on 16 October at 10:00 AM.', date: '10 Oct 2026', tone: 'accent' },
      { title: 'Internship started', body: 'Welcome to the AI Threat Detection project.', date: '14 Sep 2026', tone: 'accent' },
      { title: 'Onboarding completed', body: 'All onboarding details have been confirmed.', date: '12 Sep 2026', tone: 'accent' },
    ],
  },
  'completion-action': {
    heroLines: ['Help us close', 'the loop'],
    heroMessage: 'Your internship is complete. Share your experience while the journey is still fresh.',
    heroBadge: 'Feedback due',
    bannerLines: ['Congratulations on', 'completing your', 'internship.'],
    bannerBody: 'Share feedback on your project, mentorship and learning experience.',
    recordDate: 'Completed 11 Dec 2026',
    statusLabel: 'Completion action',
    summary: `You completed the ${INTERVIEW_PROJECT_NAME} project under Undergraduate Internship 2027.`,
    dueText: 'Submit feedback by 18 Dec 2026.',
    primaryLabel: 'Start Feedback',
    primaryRoute: '/apply/applicant-offboarding',
    secondaryLabel: 'View Internship',
    progressIndex: 3,
    progressHint: 'Complete feedback',
    detailLabel: 'Internship completion',
    detailTitle: 'One final task completes your journey.',
    detailPerson: 'Talent Outreach Team',
    detailRole: 'Internship completion',
    detailMeta: [{ label: 'Completed', value: '11 Dec 2026' }, { label: 'Feedback due', value: '18 Dec 2026' }],
    tasksKicker: 'Completion tasks',
    tasksTitle: '2 items are in progress',
    tasksDeadline: 'Feedback due 18 Dec 2026',
    tasks: [
      { title: 'Complete feedback', body: 'Share your internship experience.', cta: 'Start Feedback' },
      { title: 'Certificate preparation', body: 'We will notify you when it is ready.', cta: 'View Status' },
    ],
    activity: [
      { title: 'Feedback is ready', body: 'Share your internship experience by 18 December.', date: '11 Dec 2026', tone: 'warning' },
      { title: 'Internship completed', body: 'Congratulations on completing your internship.', date: '11 Dec 2026', tone: 'accent' },
      { title: 'Certificate preparation started', body: 'We will notify you when it is available.', date: '11 Dec 2026', tone: 'accent' },
    ],
  },
  'journey-completed': {
    heroLines: ['Look how far', 'you have come'],
    heroMessage: 'Your internship journey is complete, and your certificate is ready for what comes next.',
    heroBadge: 'Certificate available',
    bannerLines: ['Your internship', 'journey is now', 'complete.'],
    bannerBody: 'Your certificate and completed internship record will remain available here.',
    recordDate: 'Completed 18 Dec 2026',
    statusLabel: 'Journey completed',
    summary: `Your ${INTERVIEW_PROJECT_NAME} internship and all completion actions are finished.`,
    dueText: 'Certificate issued 18 Dec 2026.',
    primaryLabel: 'View Certificate',
    primaryRoute: '/apply/certification',
    secondaryLabel: 'View Internship',
    progressIndex: 4,
    progressHint: 'Journey completed',
    detailLabel: 'Journey completed',
    detailTitle: 'Your certificate is ready.',
    detailPerson: 'Talent Outreach Team',
    detailRole: 'DSTA Internships',
    detailMeta: [{ label: 'Completed', value: '18 Dec 2026' }, { label: 'Certificate', value: 'Available' }],
    tasksKicker: 'Your achievements',
    tasksTitle: '2 items are available',
    tasksDeadline: 'Available any time',
    tasks: [
      { title: 'View your certificate', body: 'Preview or download your credential.', cta: 'View Certificate' },
      { title: 'View internship record', body: 'Return to your completed internship.', cta: 'View Record' },
    ],
    activity: [
      { title: 'Certificate available', body: 'Your internship certificate is ready to view.', date: '18 Dec 2026', tone: 'accent' },
      { title: 'Feedback submitted', body: 'Thank you for sharing your experience.', date: '18 Dec 2026', tone: 'accent' },
      { title: 'Journey completed', body: 'Your internship record is complete.', date: '18 Dec 2026', tone: 'accent' },
    ],
  },
} satisfies Record<ApplicantHomeScenario, ApplicantHomeScenarioContent>;

export default function ApplyDashboardV1() {
  const { profile } = useRole();
  const router = useRouter();
  const firstName = profile.name.split(' ')[0] || 'there';
  const [quizTaken, setQuizTaken] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeslotOpen, setTimeslotOpen] = useState(false);
  const [programmeTitle, setProgrammeTitle] = useState('Undergraduate Internship 2027');
  const [scenario, setScenario] = useState<ApplicantHomeScenario>('interview-action');

  useEffect(() => {
    const d = loadApplyDraft();
    setQuizTaken(d.quizTaken);
    setAnswers(d.quizAnswers);
    setProgrammeTitle(
      d.programmeTitle ||
        programmeTitleForVariant(loadUtApplicantVariant() ?? 'undergraduate'),
    );

    setScenario(loadApplicantHomeScenario());
    function onScenarioChange(event: Event) {
      const detail = (event as CustomEvent<ApplicantHomeScenario>).detail;
      if (isApplicantHomeScenario(detail)) setScenario(detail);
    }
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, onScenarioChange);
    return () => window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, onScenarioChange);
  }, []);

  const archetype = useMemo(
    () => (quizTaken ? resolveArchetype(answers) : resolveArchetype([])),
    [quizTaken, answers],
  );
  const content = HOME_SCENARIO_CONTENT[scenario];
  const steps = useMemo(
    () => BASE_STEP_LABELS.map((label, index) => ({
      id: index + 1,
      label,
      done: content.progressIndex > index,
      current: content.progressIndex === index,
      hint: content.progressIndex === index ? content.progressHint : undefined,
    })),
    [content.progressHint, content.progressIndex],
  );
  const showApplicationMap =
    scenario === 'under-review' ||
    scenario === 'interview-action' ||
    scenario === 'interview-scheduled' ||
    scenario === 'interview-rescheduling' ||
    scenario === 'offer-action';
  const hideLatestActivity =
    scenario === 'interview-scheduled' || scenario === 'interview-rescheduling';
  const showInternshipHome =
    scenario === 'onboarding-action' ||
    scenario === 'active-internship' ||
    scenario === 'completion-action' ||
    scenario === 'journey-completed';
  const sectionEyebrow = showApplicationMap
    ? 'Application map'
    : showInternshipHome
      ? 'My internship'
      : scenario === 'draft-application'
        ? 'Application progress'
        : 'Explore internships';
  const sectionTitle = showApplicationMap
    ? 'Where you are now'
    : showInternshipHome
      ? 'AI Threat Detection'
      : scenario === 'draft-application'
        ? 'Finish your application'
        : 'Find your starting point';

  function handlePrimaryAction() {
    if (scenario === 'interview-action') {
      setTimeslotOpen(true);
      return;
    }
    router.push(content.primaryRoute);
  }

  return (
    <Shell activeRoute="/apply/dashboard" flushTop>
      {/* Cancel shell gutter; Part1 bg full-bleed */}
      <div className="relative mx-[calc(-1*clamp(24px,2.6vw,40px))]">
          {/* ── Part 1: Hero — mobile aspect from bg (780×1108); PC 345 */}
          <header
            className={cn(
              'relative z-0 w-full overflow-hidden max-lg:aspect-[780/1108] lg:overflow-visible',
              scenario === 'no-application' ? 'lg:h-[300px]' : 'lg:h-[345px]',
            )}
            style={{ background: 'rgba(254, 253, 251, 1)' }}
          >
            <div className="relative mx-auto h-full w-full max-w-[1440px]">
              {/* Desktop ship bg + radar share one contain frame (sidebar-safe) */}
              <div className="ship-float pointer-events-none absolute inset-0 z-0 hidden lg:block">
                <HeroRadarOverlay />
              </div>
              <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden">
                <Image
                  src="/images/dashboard-v1-top-m.png"
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="100vw"
                  priority
                />
              </div>

              <div className="absolute inset-x-0 top-0 z-10 px-4 pt-10 lg:inset-x-auto lg:left-16 lg:top-[60px] lg:h-[200px] lg:w-[760px] lg:px-0 lg:pt-0">
                <h1
                  className="text-[28px] font-semibold leading-8 tracking-[-0.48px] lg:text-[48px] lg:leading-[47px]"
                  style={{ color: 'rgba(15, 23, 43, 1)' }}
                >
                  {content.heroLines[0]}
                  <br />
                  {content.heroLines[1]}
                </h1>
                <p
                  className="mt-2 text-[14px] font-normal leading-[100%] lg:mt-4 lg:text-[16px]"
                  style={{ color: 'rgba(74, 85, 104, 1)' }}
                >
                  {scenario === 'no-application' ? 'Welcome' : 'Welcome back'}, {firstName}.{' '}
                  {content.heroMessage}
                </p>
                <span
                  className="mt-6 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-normal leading-4 lg:mt-4"
                  style={{
                    background: 'rgba(0, 166, 244, 0.15)',
                    color: 'rgba(0, 105, 168, 1)',
                  }}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {content.heroBadge}
                </span>
              </div>
            </div>
          </header>

          {/* New applicants do not yet have an application status card. */}
          {scenario !== 'no-application' ? (
          <div className="relative z-20 mx-auto w-full max-w-[1440px] max-lg:mt-0 lg:-mt-[345px]">
            <div className="pointer-events-none hidden lg:block lg:h-[345px]" aria-hidden />

            {/* ── Part 2: Status — height from content; PC 335 | 60 | 1fr */}
            <section
              className="relative z-20 mx-4 -mt-[70px] overflow-hidden rounded-2xl bg-white p-6 lg:absolute lg:top-[298px] lg:right-6 lg:left-6 lg:mx-0 lg:mt-0"
              style={{
                background: 'rgba(255, 255, 255, 1)',
                border: '1px solid rgba(231, 228, 221, 1)',
              }}
            >
              <div
                className="pointer-events-none absolute bottom-[47px] right-[-0px] z-0 hidden h-[285px] w-[354px] lg:block"
                aria-hidden
              >
                <Image
                  src="/images/radar-v1-new.png"
                  alt=""
                  width={354}
                  height={285}
                  className="h-[285px] w-[354px] max-w-none object-contain object-right-bottom"
                />
              </div>

              <div className="relative z-10 flex flex-col gap-6 lg:grid lg:grid-cols-[335px_minmax(0,1fr)] lg:items-start lg:gap-[60px]">
                <div
                  className="relative w-full shrink-0 overflow-hidden rounded-lg text-white max-lg:aspect-[343/371] lg:h-[338px] lg:w-[335px] lg:aspect-auto"
                  style={{ background: 'rgba(15, 45, 110, 1)' }}
                >
                  <div className="pointer-events-none absolute inset-0 z-0">
                    <Image
                      src="/images/banner-bg-v1.png"
                      alt=""
                      fill
                      className="object-cover object-bottom max-lg:hidden"
                      sizes="335px"
                    />
                    <Image
                      src="/images/banner-bg-v1-m.png"
                      alt=""
                      fill
                      className="object-cover object-bottom lg:hidden"
                      sizes="100vw"
                    />
                  </div>
                  <div className="relative z-[1] p-5">
                    <p
                      className="text-[20px] font-medium tracking-[-0.48px] leading-[28.8px] lg:text-[24px]"
                      style={{ color: 'rgba(255, 255, 255, 1)' }}
                    >
                      {content.bannerLines[0]}
                      <br />
                      {content.bannerLines[1]}
                      <br />
                      {content.bannerLines[2]}
                    </p>
                    <p
                      className="mt-0.5 text-[14px] font-normal leading-[120%] lg:mt-2"
                      style={{ color: 'rgba(255, 255, 255, 0.74)' }}
                    >
                      {content.bannerBody}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex min-w-0 w-full flex-col">
                  <div className="relative flex flex-wrap items-center justify-between gap-2">
                    <p
                      className="min-w-0 text-[12px] font-normal leading-5 lg:text-[14px]"
                      style={{ color: 'rgba(69, 85, 108, 1)' }}
                    >
                      {content.recordDate}
                    </p>
                    <span
                      className="relative z-10 inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[12px] font-normal leading-4"
                      style={{
                        background: 'rgba(244, 242, 236, 1)',
                        color: 'rgba(15, 23, 43, 1)',
                      }}
                    >
                      {content.statusLabel}
                    </span>
                  </div>
                  <h2
                    className="mt-2 text-[18px] font-semibold leading-[28.8px] lg:mt-2 lg:text-[24px] lg:tracking-[-0.48px]"
                    style={{ color: 'rgba(10, 22, 40, 1)' }}
                  >
                    {programmeTitle}
                  </h2>
                  <p
                    className="mt-0.5 text-[14px] font-normal leading-[120%] lg:mt-2"
                    style={{ color: 'rgba(74, 85, 104, 1)' }}
                  >
                    {content.summary.replace('Undergraduate Internship 2027', programmeTitle)}
                  </p>
                  <p
                    className="mt-6 text-[14px] font-medium leading-[120%] lg:mt-8"
                    style={{ color: 'rgba(74, 85, 104, 1)' }}
                  >
                    {content.dueText}
                  </p>
                  <div className="relative z-10 mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className="h-9 min-w-0 flex-1 cursor-pointer rounded-md px-3 text-[14px] text-white lg:flex-none lg:px-4"
                      style={{ background: 'rgba(26, 101, 248, 1)', height: 36 }}
                    >
                      {content.primaryLabel}
                    </button>
                    <OutOfScopeTooltip>
                      <button
                        type="button"
                        className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border border-border bg-bg px-3 text-[14px] text-fg lg:flex-none lg:px-4"
                        style={{ height: 36 }}
                      >
                        {content.secondaryLabel}
                      </button>
                    </OutOfScopeTooltip>
                  </div>
                </div>
              </div>
            </section>

            <div
              className="pointer-events-none hidden lg:block"
              /* Part2 top 298 + p-6 + 338 col + p-6 + 24 gap − hero spacer 345 */
              style={{ height: 'calc(298px + 24px + 338px + 24px + 24px - 345px)' }}
              aria-hidden
            />
          </div>
          ) : null}

          {/* ── Part 3: mobile inset 16; PC 1fr | 20 | 314 ─── */}
          <div
            className={cn(
              'relative mx-auto w-full max-w-[1440px] px-4 pb-8 lg:px-6',
              scenario === 'no-application' ? 'pt-4 lg:pt-4' : 'pt-6 lg:pt-0',
            )}
          >
            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_314px] lg:items-start lg:gap-5">
              <div className="flex min-w-0 w-full flex-col gap-5">
                <section
                  className="relative min-w-0 overflow-hidden rounded-lg p-6 max-lg:pr-6 lg:pr-8"
                  style={{
                    borderRadius: 8,
                    border: '1px solid rgba(231, 228, 221, 1)',
                    background: 'rgba(251, 252, 253, 1)',
                  }}
                >
                  <div
                    className="pointer-events-none absolute right-0 top-0 z-0 hidden h-[116px] w-[370px] lg:block"
                    aria-hidden
                  >
                    <Image
                      src="/images/map-right-top-v1.png"
                      alt=""
                      width={370}
                      height={116}
                      className="h-[116px] w-[370px] max-w-none object-contain object-right-top"
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute right-[26px] top-[124px] z-0 h-[72px] w-[260px] lg:hidden"
                    aria-hidden
                  >
                    <Image
                      src="/images/map-right-top-v1-m.png"
                      alt=""
                      width={260}
                      height={72}
                      className="h-[72px] w-[260px] max-w-none object-contain object-right-top"
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute bottom-0 left-10 z-0 hidden h-[140px] w-[240px] lg:block lg:h-[177px] lg:w-[323px]"
                    aria-hidden
                  >
                    <Image
                      src="/images/map-left-down-v1.png"
                      alt=""
                      fill
                      className="object-contain object-left-bottom"
                      sizes="323px"
                    />
                  </div>

                  <div className="relative z-[1]">
                    <p
                      style={{
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: '20px',
                        color: 'rgba(69, 85, 108, 1)',
                      }}
                    >
                      {sectionEyebrow}
                    </p>
                    <h3
                      className="mt-1.5 text-[20px] font-semibold leading-[28.8px] lg:mt-0.5 lg:text-[18px] lg:leading-6 lg:tracking-[-0.45px]"
                      style={{ color: 'rgba(10, 22, 40, 1)' }}
                    >
                      {sectionTitle}
                    </h3>

                    {showApplicationMap ? (
                      <>
                    {/* Mobile: horizontal step dots — 24 below title, 14 above Interview */}
                    <ol
                      className="mt-6 flex w-full items-center lg:hidden"
                      aria-label="Application progress"
                    >
                      {steps.map((step, i) => {
                        const isLast = i === steps.length - 1;
                        return (
                          <li
                            key={step.id}
                            className={cn('flex items-center', !isLast && 'min-w-0 flex-1')}
                          >
                            <StepGlyph step={step} />
                            {!isLast && (
                              <span
                                className="mx-2 h-px min-w-[12px] flex-1"
                                style={{ background: 'rgba(163, 163, 163, 1)' }}
                                aria-hidden
                              />
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {/* Mobile: Interview + invitation + tasks (16px gap) */}
                    <div className="relative mt-3.5 lg:hidden">
                      <div className="relative">
                        <h4
                          className="text-[18px] font-medium leading-[28.8px]"
                          style={{ color: 'rgba(10, 22, 40, 1)' }}
                        >
                          {content.detailLabel}
                        </h4>
                        <p
                          className="mt-0.5 text-[14px] font-normal leading-[100%]"
                          style={{ color: 'rgba(74, 85, 104, 1)' }}
                        >
                          {content.progressHint}
                        </p>
                      </div>
                      <JourneyDetailCard content={content} className="relative mt-6" mobile />
                      <TasksCard content={content} className="relative mt-4" stacked />
                    </div>

                    {/* Desktop: 143 | 40 | 1fr */}
                    <div className="mt-12 hidden lg:grid lg:grid-cols-[143px_minmax(0,1fr)] lg:gap-10">
                      <ol
                        className="flex w-[143px] shrink-0 flex-col"
                        aria-label="Application progress"
                      >
                        {steps.map((step, i) => {
                          const isLast = i === steps.length - 1;
                          const lineDone = step.done;
                          return (
                            <li key={step.id} className="flex gap-3">
                              <div className="flex w-6 shrink-0 flex-col items-center">
                                <StepGlyph step={step} />
                                {!isLast && (
                                  <>
                                    <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                                    <span
                                      className="block w-px shrink-0"
                                      style={{
                                        height: 62,
                                        background: lineDone
                                          ? 'rgba(69, 85, 108, 1)'
                                          : 'rgba(163, 163, 163, 1)',
                                      }}
                                      aria-hidden
                                    />
                                    <span className="block w-px shrink-0" style={{ height: 8 }} aria-hidden />
                                  </>
                                )}
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p
                                  className="text-[14px] font-normal leading-[140%]"
                                  style={{
                                    color:
                                      step.done || step.current
                                        ? 'rgba(0, 0, 0, 0.87)'
                                        : 'rgba(74, 85, 104, 1)',
                                  }}
                                >
                                  {step.label}
                                </p>
                                {step.hint && (
                                  <p
                                    className="mt-0.5 text-[12px] font-normal leading-[140%]"
                                    style={{ color: 'rgba(74, 85, 104, 0.87)' }}
                                  >
                                    {step.hint}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>

                      <div className="min-w-0 w-full space-y-4">
                        <JourneyDetailCard content={content} />
                        <TasksCard content={content} />
                      </div>
                    </div>
                      </>
                    ) : showInternshipHome ? (
                      <InternshipHomeSection scenario={scenario} content={content} />
                    ) : (
                      <PreApplicationSection scenario={scenario} content={content} />
                    )}
                  </div>
                </section>

                {/* Latest activity — intentionally hidden while an interview slot state is active. */}
                {!hideLatestActivity ? (
                <section className="relative overflow-hidden rounded-2xl border border-border bg-white p-6">
                  <div className="relative z-[1] flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-3">
                    <div>
                      <p
                        className="text-[14px] font-normal leading-5"
                        style={{ color: 'rgba(69, 85, 108, 1)' }}
                      >
                        Latest activity
                      </p>
                      <h3
                        className="mt-1.5 text-[18px] font-semibold leading-6 lg:mt-0.5 lg:tracking-[-0.45px]"
                        style={{ color: 'rgba(10, 22, 40, 1)' }}
                      >
                        Updates from your journey
                      </h3>
                    </div>
                    {content.activity.length > 0 ? (
                      <OutOfScopeTooltip>
                        <button
                          type="button"
                          className="mt-4 self-start cursor-pointer text-[14px] font-medium leading-5 text-[rgba(26,101,248,1)] lg:mt-0"
                        >
                          Mark all read
                        </button>
                      </OutOfScopeTooltip>
                    ) : null}
                  </div>

                  {content.activity.length === 0 ? (
                    <div className="relative z-[1] mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-subtle px-6 text-center">
                      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-bg text-fg-muted" aria-hidden>
                        <Calendar className="size-5" strokeWidth={1.5} />
                      </span>
                      <p className="text-[16px] font-semibold leading-6 text-fg">No activity yet</p>
                      <p className="mt-1 max-w-md text-[14px] leading-5 text-fg-muted">
                        Updates will appear here after you start an application.
                      </p>
                    </div>
                  ) : (
                  <div className="relative z-[1] mt-6 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,676px)_270px] lg:gap-4">
                    <ol
                      className="relative min-w-0 w-full lg:max-w-[676px]"
                      aria-label="Activity timeline"
                    >
                      {content.activity.map((item, i) => {
                        const isLast = i === content.activity.length - 1;
                        return (
                          <li key={item.title} className="flex items-stretch gap-6">
                            <div className="relative w-2.5 shrink-0 self-stretch">
                              <span
                                className="relative z-[1] mx-auto mt-[6px] block size-2.5 rounded-full"
                                style={{
                                  background:
                                    item.tone === 'warning'
                                      ? 'rgba(246, 104, 14, 1)'
                                      : 'rgba(26, 101, 248, 1)',
                                }}
                                aria-hidden
                              />
                              {/* Rail stretches with content+pb; line runs gap and meets next dot */}
                              {!isLast && (
                                <span
                                  className="absolute left-1/2 top-[15px] bottom-[-6px] w-px -translate-x-1/2"
                                  style={{ background: 'rgba(231, 228, 221, 1)' }}
                                  aria-hidden
                                />
                              )}
                            </div>
                            <div
                              className={cn(
                                'flex min-w-0 flex-1 flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-3',
                                !isLast && 'pb-6',
                              )}
                            >
                              <div className="min-w-0">
                                <p
                                  className="text-[16px] font-medium leading-[140%] lg:text-[14px] lg:font-semibold lg:leading-5"
                                  style={{ color: 'rgba(0, 0, 0, 0.87)' }}
                                >
                                  {item.title}
                                </p>
                                <p
                                  className="mt-0.5 text-[12px] font-normal leading-[140%] lg:text-[13px] lg:leading-5"
                                  style={{ color: 'rgba(69, 85, 108, 0.87)' }}
                                >
                                  {item.body}
                                </p>
                              </div>
                              <span className="mt-4 inline-flex shrink-0 items-center gap-1 lg:mt-0 lg:pt-0.5">
                                <Calendar
                                  className="size-4 shrink-0 lg:size-3.5"
                                  strokeWidth={1.5}
                                  style={{ color: 'rgba(3, 3, 3, 1)' }}
                                />
                                <span
                                  className="text-[12px] font-normal leading-4"
                                  style={{ color: 'rgba(3, 3, 3, 1)' }}
                                >
                                  {item.date}
                                </span>
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ol>

                    <div className="pointer-events-none relative mx-auto hidden h-[200px] w-[270px] shrink-0 lg:block">
                      <Image
                        src="/images/activity-v1.png"
                        alt=""
                        fill
                        className="object-contain object-right-bottom"
                        sizes="270px"
                      />
                    </div>
                  </div>
                  )}
                </section>
                ) : null}
              </div>

              {scenario === 'no-application' ? (
                <NoApplicationAside />
              ) : showInternshipHome ? (
                <InternshipStageAside scenario={scenario} onOpen={() => router.push(content.primaryRoute)} />
              ) : (
              <aside
                className="relative mx-auto h-auto min-h-[420px] w-full shrink-0 overflow-hidden rounded-2xl p-6 max-lg:max-w-none lg:mx-0 lg:h-[423px] lg:min-h-0 lg:w-[314px] lg:max-w-[314px]"
                style={{
                  border: '1px solid rgba(231, 228, 221, 1)',
                  boxShadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
                  <Image
                    src={archetypeResultImage(archetype.id, 'pc')}
                    alt=""
                    fill
                    className="object-cover object-bottom max-lg:hidden"
                    sizes="314px"
                  />
                  <Image
                    src={archetypeResultImage(archetype.id, 'mobile')}
                    alt=""
                    fill
                    className="object-cover object-bottom lg:hidden"
                    sizes="100vw"
                  />
                </div>

                <div className="relative z-[1]">
                  <p
                    className="text-[12px] font-normal leading-6"
                    style={{ color: 'rgba(41, 41, 41, 1)' }}
                  >
                    Your defender archetype
                  </p>
                  <h3
                    className="mt-0.5 text-[24px] font-semibold leading-[44px] lg:text-[28px]"
                    style={{ color: archetype.color }}
                  >
                    {archetype.name}
                  </h3>
                  <p
                    className="mt-2 text-[14px] font-normal leading-6 lg:text-[16px]"
                    style={{ color: 'rgba(69, 85, 108, 1)' }}
                  >
                    {archetype.tagline}
                  </p>
                </div>

                <OutOfScopeTooltip>
                  <button
                    type="button"
                    className="absolute bottom-9 left-6 z-[1] h-8 cursor-pointer rounded-md px-3 text-[12px] font-medium leading-4 lg:bottom-6"
                    style={{
                      background: 'rgba(26, 101, 248, 1)',
                      color: 'rgba(255, 255, 255, 1)',
                      fontWeight: 500,
                      fontSize: 12,
                      lineHeight: '16px',
                    }}
                  >
                    Play Quiz Again
                  </button>
                </OutOfScopeTooltip>
              </aside>
              )}
            </div>
          </div>
      </div>

      <InterviewTimeslotSheet
        open={timeslotOpen}
        onOpenChange={setTimeslotOpen}
        projectName={INTERVIEW_PROJECT_NAME}
        allowCustomRequest
        sourceVersion="v1"
      />
    </Shell>
  );
}

function PreApplicationSection({
  scenario,
  content,
}: {
  scenario: ApplicantHomeScenario;
  content: ApplicantHomeScenarioContent;
}) {
  const isDraft = scenario === 'draft-application';
  const stages = isDraft
    ? [
        { label: 'Profile', state: 'done' },
        { label: 'Education', state: 'done' },
        { label: 'Preferences', state: 'current' },
        { label: 'Review', state: 'upcoming' },
      ]
    : [
        { label: 'Explore', state: 'current' },
        { label: 'Match', state: 'upcoming' },
        { label: 'Apply', state: 'upcoming' },
      ];

  return (
    <div className="mt-8 space-y-4">
      {isDraft ? (
      <div className="rounded-xl border border-border bg-white p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[14px] text-fg-muted">
              {isDraft ? 'Your application is saved automatically' : 'A simple path to your first application'}
            </p>
            <p className="mt-1 text-[18px] font-semibold text-fg">
              {isDraft ? '4 of 6 sections completed' : 'Explore before you commit'}
            </p>
          </div>
          <p className="text-[13px] font-medium text-accent">
            {isDraft ? 'About 8 minutes remaining' : 'Applications close 30 Sep 2026'}
          </p>
        </div>
        <ol className="mt-6 grid gap-3 sm:grid-cols-4" aria-label={isDraft ? 'Draft application progress' : 'Application journey'}>
          {stages.map((stage, index) => (
            <li key={stage.label} className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px]',
                  stage.state === 'done' && 'border-transparent bg-[rgba(24,184,166,1)] text-white',
                  stage.state === 'current' && 'border-transparent bg-[rgba(26,101,248,1)] text-white',
                  stage.state === 'upcoming' && 'border-border bg-bg-subtle text-fg-muted',
                )}
              >
                {stage.state === 'done' ? '✓' : index + 1}
              </span>
              <span className={cn('text-[13px]', stage.state === 'upcoming' ? 'text-fg-muted' : 'font-medium text-fg')}>
                {stage.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
      ) : null}

      <div className={cn('grid gap-4', isDraft && 'lg:grid-cols-2')}>
        {isDraft ? <JourneyDetailCard content={content} mobile /> : null}
        <TasksCard content={content} stacked={isDraft} />
      </div>
    </div>
  );
}

function InternshipHomeSection({
  scenario,
  content,
}: {
  scenario: ApplicantHomeScenario;
  content: ApplicantHomeScenarioContent;
}) {
  const currentIndex =
    scenario === 'onboarding-action'
      ? 0
      : scenario === 'active-internship'
        ? 2
        : scenario === 'completion-action'
          ? 3
          : 4;
  const internshipStages = ['Onboarding', 'Ready', 'Active', 'Complete'];
  const status =
    scenario === 'onboarding-action'
      ? 'Onboarding'
      : scenario === 'active-internship'
        ? 'Active internship'
        : scenario === 'completion-action'
          ? 'Completion action'
          : 'Completed';

  return (
    <div className="mt-8 space-y-4">
      <div className="rounded-xl border border-border bg-white p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[18px] font-semibold text-fg">Undergraduate Internship 2027</p>
              <span className="rounded-full bg-[rgba(0,188,125,0.15)] px-2.5 py-1 text-[12px] text-[rgba(0,122,85,1)]">
                {status}
              </span>
            </div>
            <p className="mt-2 text-[14px] text-fg-muted">Digital Hub · Mentor: Aisha Rahman</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
            <div><span className="block text-fg-muted">Period</span><span className="font-medium text-fg">14 Sep – 11 Dec 2026</span></div>
            <div><span className="block text-fg-muted">Location</span><span className="font-medium text-fg">Depot Road</span></div>
          </div>
        </div>
        <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Internship progress">
          {internshipStages.map((stage, index) => {
            const done = currentIndex > index;
            const current = currentIndex === index;
            return (
              <li key={stage} className="min-w-0">
                <div className="flex items-center">
                  <span
                    className={cn(
                      'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[12px]',
                      done && 'border-transparent bg-[rgba(24,184,166,1)] text-white',
                      current && 'border-transparent bg-[rgba(26,101,248,1)] text-white',
                      !done && !current && 'border-border bg-bg-subtle text-fg-muted',
                    )}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  {index < internshipStages.length - 1 ? (
                    <span className="mx-2 h-px min-w-0 flex-1 bg-border" aria-hidden />
                  ) : null}
                </div>
                <p className={cn('mt-2 truncate text-[12px]', current ? 'font-semibold text-fg' : 'text-fg-muted')}>{stage}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JourneyDetailCard content={content} mobile />
        <TasksCard content={content} stacked />
      </div>
    </div>
  );
}

function NoApplicationAside() {
  const preparationItems = [
    'Check programme eligibility',
    'Prepare your education details',
    'Review available project areas',
  ];

  return (
    <aside className="relative mx-auto min-h-[360px] w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm max-lg:max-w-none lg:mx-0 lg:min-h-[423px] lg:w-[314px] lg:max-w-[314px]">
      <p className="text-[12px] leading-5 text-fg-muted">Application guide</p>
      <h3 className="mt-1 text-[24px] font-semibold leading-8 text-fg">Before you apply</h3>
      <p className="mt-3 text-[14px] leading-5 text-fg-muted">
        Have these details ready when you decide to start an application.
      </p>

      <ol className="mt-6 space-y-4" aria-label="Application preparation checklist">
        {preparationItems.map((item, index) => (
          <li key={item} className="flex items-center gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-subtle text-[12px] font-medium text-fg">
              {index + 1}
            </span>
            <span className="text-[14px] leading-5 text-fg">{item}</span>
          </li>
        ))}
      </ol>

      <div className="mt-7 rounded-xl bg-bg-subtle p-4">
        <p className="text-[12px] leading-4 text-fg-muted">Application window</p>
        <p className="mt-1 text-[14px] font-semibold leading-5 text-fg">Open until 30 Sep 2026</p>
      </div>

      <OutOfScopeTooltip>
        <button
          type="button"
          className="mt-5 h-9 cursor-pointer rounded-md border border-border bg-white px-4 text-[13px] font-medium text-accent"
        >
          View application guide
        </button>
      </OutOfScopeTooltip>
    </aside>
  );
}

function InternshipStageAside({
  scenario,
  onOpen,
}: {
  scenario: ApplicantHomeScenario;
  onOpen: () => void;
}) {
  const copy = scenario === 'onboarding-action'
    ? { eyebrow: 'Onboarding progress', value: '3 of 6', body: 'Complete your remaining tasks before day one.', cta: 'Continue onboarding' }
    : scenario === 'active-internship'
      ? { eyebrow: 'Internship progress', value: 'Week 5 of 12', body: 'Your next mentor check-in is on 16 Oct 2026.', cta: 'View internship' }
      : scenario === 'completion-action'
        ? { eyebrow: 'Completion checklist', value: '1 action left', body: 'Submit your internship feedback by 18 Dec 2026.', cta: 'Start feedback' }
        : { eyebrow: 'Your achievement', value: 'Certificate ready', body: 'Your certificate and completed record are available any time.', cta: 'View certificate' };

  return (
    <aside
      className="relative mx-auto min-h-[360px] w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-sm max-lg:max-w-none lg:mx-0 lg:min-h-[423px] lg:w-[314px] lg:max-w-[314px]"
    >
      <div className="relative z-[1]">
        <p className="text-[12px] leading-6 text-fg-muted">{copy.eyebrow}</p>
        <h3 className="mt-1 text-[26px] font-semibold leading-8 text-accent">{copy.value}</h3>
        <p className="mt-3 text-[14px] leading-6 text-fg-muted">{copy.body}</p>
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-16 h-[180px]" aria-hidden>
        <Image src="/images/activity-v1.png" alt="" fill className="object-contain object-right-bottom" sizes="270px" />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="absolute bottom-6 left-6 z-[1] h-8 cursor-pointer rounded-md bg-[rgba(26,101,248,1)] px-3 text-[12px] font-medium text-white"
      >
        {copy.cta}
      </button>
    </aside>
  );
}

function StepGlyph({
  step,
}: {
  step: { id: number; done: boolean; current?: boolean };
}) {
  if (step.done) {
    return (
      <Image
        src="/images/step-complete.svg"
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0"
      />
    );
  }
  if (step.current) {
    return (
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white"
        style={{
          background: 'rgba(27, 101, 248, 1)',
          fontWeight: 400,
          fontSize: 14,
          lineHeight: '140%',
        }}
      >
        {step.id}
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
      style={{
        background: 'rgba(231, 228, 221, 1)',
        border: '1px solid rgba(231, 228, 221, 1)',
        color: 'rgba(98, 116, 142, 1)',
        fontWeight: 400,
        fontSize: 14,
        lineHeight: '140%',
      }}
    >
      {step.id}
    </span>
  );
}

function RespondBy({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Calendar
        className="size-4 shrink-0"
        strokeWidth={1.5}
        style={{ color: 'rgba(3, 3, 3, 1)' }}
      />
      <span
        className="text-[12px] font-normal leading-4"
        style={{ color: 'rgba(3, 3, 3, 1)' }}
      >
        {text}
      </span>
    </span>
  );
}

function JourneyDetailCard({
  content,
  className,
  mobile = false,
}: {
  content: ApplicantHomeScenarioContent;
  className?: string;
  mobile?: boolean;
}) {
  return (
    <article
      className={cn(
        'flex h-auto w-full flex-col rounded-xl border border-border bg-white p-6',
        !mobile && 'lg:h-[256px]',
        className,
      )}
    >
      {mobile ? (
        <>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailLabel}
          </p>
          <p
            className="mt-1.5 text-[18px] font-semibold leading-6"
            style={{ color: 'rgba(10, 22, 40, 1)' }}
          >
            {content.detailTitle}
          </p>
          <div className="mt-3">
            <RespondBy text={content.tasksDeadline} />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              className="text-[14px] font-normal leading-5"
              style={{ color: 'rgba(69, 85, 108, 1)' }}
            >
              {content.detailLabel}
            </p>
            <RespondBy text={content.tasksDeadline} />
          </div>
          <p
            className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailTitle}
          </p>
        </>
      )}

      <div className={cn('flex items-center gap-4', mobile ? 'mt-6' : 'mt-4')}>
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[14px] font-medium"
          style={{
            background: 'rgba(244, 242, 236, 1)',
            color: 'rgba(15, 23, 43, 1)',
          }}
        >
          {content.detailPerson.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p
            className="text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailPerson}
          </p>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailRole}
          </p>
        </div>
      </div>
      <div
        className={cn(
          'mt-6 flex flex-col',
          mobile ? 'gap-4' : 'gap-3 lg:flex-row lg:flex-wrap lg:gap-x-10 lg:gap-y-3',
        )}
      >
        <div>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailMeta[0].label}
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailMeta[0].value}
          </p>
        </div>
        <div>
          <p
            className="text-[14px] font-normal leading-5"
            style={{ color: 'rgba(69, 85, 108, 1)' }}
          >
            {content.detailMeta[1].label}
          </p>
          <p
            className="mt-1 text-[14px] font-medium leading-5"
            style={{ color: 'rgba(15, 23, 43, 1)' }}
          >
            {content.detailMeta[1].value}
          </p>
        </div>
      </div>
    </article>
  );
}

function TasksCard({
  content,
  stacked = false,
  className,
}: {
  content: ApplicantHomeScenarioContent;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'flex h-auto w-full flex-col rounded-xl border border-border bg-white p-6',
        !stacked && 'lg:h-[308px]',
        className,
      )}
    >
      <div
        className={cn(
          'flex gap-2',
          stacked ? 'flex-col' : 'flex-wrap items-center justify-between',
        )}
      >
        <p
          className="text-[14px] font-normal leading-5"
          style={{ color: 'rgba(69, 85, 108, 1)' }}
        >
          {content.tasksKicker}
        </p>
        {!stacked && <RespondBy text={content.tasksDeadline} />}
      </div>
      <p
        className="mt-1.5 text-[18px] font-semibold tracking-[-0.45px] leading-6"
        style={{ color: 'rgba(15, 23, 43, 1)' }}
      >
        {content.tasksTitle}
      </p>
      {stacked && (
        <div className="mt-2">
          <RespondBy text={content.tasksDeadline} />
        </div>
      )}
      <div
        className={cn(
          'mt-4 grid min-h-0 flex-1 gap-3',
          stacked ? 'grid-cols-1' : 'sm:grid-cols-2',
        )}
      >
        <TaskTile
          title={content.tasks[0].title}
          body={content.tasks[0].body}
          cta={content.tasks[0].cta}
          image={stacked ? '/images/contact-details-m.jpg' : '/images/contact-details.jpg'}
          compact={stacked}
        />
        <TaskTile
          title={content.tasks[1].title}
          body={content.tasks[1].body}
          cta={content.tasks[1].cta}
          image={stacked ? '/images/additional-information-m.jpg' : '/images/additional-information.jpg'}
          compact={stacked}
        />
      </div>
    </article>
  );
}

function TaskTile({
  title,
  body,
  cta,
  image,
  compact = false,
}: {
  title: string;
  body: string;
  cta: string;
  image: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-surface',
        compact ? 'min-h-[160px] p-4 pb-14' : 'h-[190px] pt-7 pl-6 pr-3 pb-3',
      )}
    >
      <p
        className={cn(
          'w-full font-semibold',
          compact
            ? 'pr-6 text-[16px] font-semibold leading-[18px]'
            : 'pr-24 text-[13px] text-fg',
        )}
        style={compact ? { color: 'rgba(15, 23, 43, 1)' } : undefined}
      >
        {title}
      </p>
      <p
        className={cn(
          'w-full',
          compact
            ? 'mt-1.5 pr-6 text-[14px] font-normal leading-5'
            : 'mt-1 pr-24 text-[12px] leading-snug text-fg-muted',
        )}
        style={compact ? { color: 'rgba(69, 85, 108, 1)' } : undefined}
      >
        {body}
      </p>
      <OutOfScopeTooltip>
        <button
          type="button"
          className={cn(
            'absolute z-[1] h-8 cursor-pointer rounded-md px-3 text-[13px] text-white',
            compact ? 'bottom-4 left-4' : 'bottom-6 left-6',
          )}
          style={{ background: 'rgba(26, 101, 248, 1)', height: 32 }}
        >
          {cta}
        </button>
      </OutOfScopeTooltip>
      <div
        className={cn(
          'pointer-events-none absolute',
          compact
            ? 'bottom-[5px] right-[14px] size-20'
            : 'bottom-3 right-[14px] h-24 w-24',
        )}
      >
        <Image src={image} alt="" fill className="object-contain" sizes={compact ? '80px' : '96px'} />
      </div>
    </div>
  );
}
