'use client';

import { useEffect, useMemo, useState } from 'react';
import { APPLICANT_INTERVIEW_CONFIRMED_EVENT, loadApplicantInterviewSelection } from '@/lib/applicant-mentor-interview';
import applicationScenarios from '@/data/applicant-home-applications-scenarios.json';
import interviewScenarios from '@/data/applicant-home-interviews-scenarios.json';
import offerScenarios from '@/data/applicant-home-offers-scenarios.json';
import internshipScenarios from '@/data/applicant-home-internships-scenarios.json';
import certificationScenarios from '@/data/applicant-home-certification-scenarios.json';
import {
  APPLICANT_HOME_SCENARIO_CHANGED,
  isApplicantHomeScenario,
  loadApplicantHomeScenario,
} from '@/lib/applicant-home-scenario';
import type {
  ApplicantHomeScenario,
  ApplicantScenarioApplicationRecord,
  ApplicantScenarioCertificationRecord,
  ApplicantScenarioId,
  ApplicantScenarioInternshipRecord,
  ApplicantScenarioInterviewRecord,
  ApplicantScenarioOfferRecord,
} from '@/lib/types';

type ScenarioCollection<T> = Record<ApplicantScenarioId, T>;

const APPLICATIONS = applicationScenarios as ScenarioCollection<ApplicantScenarioApplicationRecord[]>;
const INTERVIEWS = interviewScenarios as ScenarioCollection<ApplicantScenarioInterviewRecord[]>;
const OFFERS = offerScenarios as ScenarioCollection<ApplicantScenarioOfferRecord[]>;
const INTERNSHIPS = internshipScenarios as ScenarioCollection<ApplicantScenarioInternshipRecord[]>;
const CERTIFICATION = certificationScenarios as ScenarioCollection<ApplicantScenarioCertificationRecord>;
const EMPTY_APPLICATIONS: ApplicantScenarioApplicationRecord[] = [];
const EMPTY_INTERVIEWS: ApplicantScenarioInterviewRecord[] = [];
const EMPTY_OFFERS: ApplicantScenarioOfferRecord[] = [];
const EMPTY_INTERNSHIPS: ApplicantScenarioInternshipRecord[] = [];

export function scenarioIdForApplicantHomeScenario(
  scenario: ApplicantHomeScenario,
): ApplicantScenarioId | null {
  const mapping: Record<ApplicantHomeScenario, ApplicantScenarioId | null> = {
    'multiple-applications': null,
    'no-application': null,
    'draft-application': 'S01',
    'submitted': 'SUBMITTED',
    'under-review': 'S02',
    'interview-action': 'S03',
    'interview-pending-confirmation': 'S04',
    'interview-rescheduling': 'S04',
    'interview-scheduled': 'S05',
    'interview-completed': 'S06',
    'offer-action': 'S07',
    'onboarding-action': 'S08',
    'application-unsuccessful': 'S06',
    'application-withdrawn': 'S06',
    'offer-declined': 'S06',
    'offer-expired': 'S06',
    'active-internship': 'S09',
    'completion-action': 'S10',
    'journey-completed': 'S11',
    'polytechnic-to-undergraduate': 'S11',
  };
  return mapping[scenario];
}

export function useApplicantScenarioData() {
  const [homeScenario, setHomeScenario] = useState<ApplicantHomeScenario>('interview-action');
  const [selectedSlot, setSelectedSlot] = useState<ReturnType<typeof loadApplicantInterviewSelection>>(null);
  const [comments, setComments] = useState('');

  useEffect(() => {
    setHomeScenario(loadApplicantHomeScenario());
    function refreshInterview() {
      setSelectedSlot(loadApplicantInterviewSelection());
      try { setComments(localStorage.getItem('dsta_interview_availability') || ''); } catch {}
    }
    refreshInterview();
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<ApplicantHomeScenario>).detail;
      setHomeScenario(isApplicantHomeScenario(detail) ? detail : loadApplicantHomeScenario());
      refreshInterview();
    }
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleChange);
    window.addEventListener(APPLICANT_INTERVIEW_CONFIRMED_EVENT, refreshInterview);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleChange);
      window.removeEventListener(APPLICANT_INTERVIEW_CONFIRMED_EVENT, refreshInterview);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const scenarioId = scenarioIdForApplicantHomeScenario(homeScenario);
  const interviews = useMemo(() => (scenarioId ? INTERVIEWS[scenarioId] : EMPTY_INTERVIEWS).map(record => {
    if (record.status === 'CONFIRMED' && selectedSlot) return { ...record, confirmedStart: selectedSlot.displayDateTime, statusMessage: `Your interview is confirmed for ${selectedSlot.displayDateTime}.` };
    if (record.status === 'AWAITING MENTOR CONFIRMATION' && comments) return { ...record, applicantAlternativeAvailability: comments };
    return record;
  }), [scenarioId, selectedSlot, comments]);
  const applications = useMemo(() => (scenarioId ? APPLICATIONS[scenarioId] : EMPTY_APPLICATIONS).map(record => {
    if (!record.focal) return record;
    const terminal = { 'application-unsuccessful': 'UNSUCCESSFUL', 'application-withdrawn': 'WITHDRAWN', 'offer-declined': 'OFFER DECLINED', 'offer-expired': 'OFFER EXPIRED' } as const;
    const terminalStatus = terminal[homeScenario as keyof typeof terminal];
    if (terminalStatus) return { ...record, statusBadge: terminalStatus, tabGroup: 'closed' as const, cardMessage: `This application is closed (${terminalStatus.toLowerCase()}). You can still view your application record.`, actionDeadline: null, primaryCta: 'View application', secondaryCta: null };
    const interview = interviews[0];
    if (record.statusBadge === 'INTERVIEW' && interview) return { ...record, cardMessage: interview.statusMessage, primaryCta: interview.status === 'ACTION REQUIRED' ? 'Choose a timeslot' : interview.status === 'AWAITING MENTOR CONFIRMATION' ? 'View interview request' : 'View interview' };
    return record;
  }), [scenarioId, homeScenario, interviews]);
  return {
    homeScenario,
    scenarioId,
    applications,
    interviews,
    offers: scenarioId ? OFFERS[scenarioId] : EMPTY_OFFERS,
    internships: scenarioId ? INTERNSHIPS[scenarioId] : EMPTY_INTERNSHIPS,
    certification: scenarioId ? CERTIFICATION[scenarioId] : CERTIFICATION.S01,
  };
}
