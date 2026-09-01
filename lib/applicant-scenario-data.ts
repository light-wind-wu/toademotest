'use client';

import { useEffect, useState } from 'react';
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
    'interview-pending-confirmation': 'S05',
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
  };
  return mapping[scenario];
}

export function useApplicantScenarioData() {
  const [homeScenario, setHomeScenario] = useState<ApplicantHomeScenario>('interview-action');

  useEffect(() => {
    setHomeScenario(loadApplicantHomeScenario());
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<ApplicantHomeScenario>).detail;
      if (isApplicantHomeScenario(detail)) setHomeScenario(detail);
    }
    window.addEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleChange);
    return () => window.removeEventListener(APPLICANT_HOME_SCENARIO_CHANGED, handleChange);
  }, []);

  const scenarioId = scenarioIdForApplicantHomeScenario(homeScenario);
  return {
    homeScenario,
    scenarioId,
    applications: scenarioId ? APPLICATIONS[scenarioId] : EMPTY_APPLICATIONS,
    interviews: scenarioId ? INTERVIEWS[scenarioId] : EMPTY_INTERVIEWS,
    offers: scenarioId ? OFFERS[scenarioId] : EMPTY_OFFERS,
    internships: scenarioId ? INTERNSHIPS[scenarioId] : EMPTY_INTERNSHIPS,
    certification: scenarioId ? CERTIFICATION[scenarioId] : CERTIFICATION.S01,
  };
}
