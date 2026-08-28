/**
 * Mentor usability-test fixtures.
 *
 * Seeds projects, applications and shared interview sessions for the
 * `mentor` role (Wei Jian Lim) so the Mentor pages are not empty when
 * accessed via manual role switch or the future /catlog entry.
 */

import type {
  Application,
  EducationLevel,
  Programme,
  ProjectEntry,
  SharedInterviewSession,
  SuitabilityScore,
} from '@/lib/types';
import {
  loadProjects,
  saveProjects,
  loadSharedInterviewSessions,
  saveSharedInterviewSessions,
} from '@/lib/storage';
import {
  loadApplications,
  saveApplications,
  upsertProgrammes,
} from '@/lib/ut-scenarios/utils';

export const MENTOR_EMAIL = 'weijian.lim@dsta.gov.sg';

export const MENTOR_PROJECT_CYPHER = 'ut-mentor-cyber';
export const MENTOR_PROJECT_AIOPS = 'ut-mentor-aiops';
export const MENTOR_PROJECT_CLOSED = 'ut-mentor-closed';

export const MENTOR_PROJECT_IDS = [
  MENTOR_PROJECT_CYPHER,
  MENTOR_PROJECT_AIOPS,
  MENTOR_PROJECT_CLOSED,
];

export const MENTOR_APPLICATION_IDS = [
  'ut-mentor-nadia',
  'ut-mentor-isaac',
  'ut-mentor-ethan',
  'ut-mentor-marcus',
  'ut-mentor-chloe',
  'ut-mentor-daniel',
  'ut-mentor-priya',
  'ut-mentor-ryan',
];

export const MENTOR_SESSION_ISAAC_TUE = 'ut-mentor-session-isaac-tue';
export const MENTOR_SESSION_ISAAC_MON = 'ut-mentor-session-isaac-mon';
export const MENTOR_SESSION_ISAAC_WED = 'ut-mentor-session-isaac-wed';
export const MENTOR_SESSION_ETHAN = 'ut-mentor-session-ethan';

export const MENTOR_SESSION_IDS = [
  MENTOR_SESSION_ETHAN,
];

const MENTOR_PROGRAMME_ID = 'ut-mentor-programme';
const MENTOR_EDUCATION_LEVEL: EducationLevel = 'Undergraduate Student';

export function mentorProgramme(): Programme {
  return {
    id: MENTOR_PROGRAMME_ID,
    title: 'University Internship 2026',
    educationLevel: MENTOR_EDUCATION_LEVEL,
    status: 'Active',
    appOpen: '2026-02-01',
    appDeadline: '2026-06-30',
    start: '2026-05-04',
    end: '2026-08-28',
    timeline: 'May – Aug 2026',
    daysLeft: 37,
    description: 'Usability-test programme for the Mentor workspace.',
    requirements: [],
    intakeWindows: [
      {
        id: 'ut-mentor-intake-1',
        intakeTitle: 'University 2026 (May – Aug)',
        appOpen: '2026-02-01',
        appClose: '2026-06-30',
        start: '2026-05-04',
        end: '2026-08-28',
      },
    ],
  };
}

export function mentorProjects(): ProjectEntry[] {
  return [
    {
      id: MENTOR_PROJECT_CYPHER,
      title: 'Cybersecurity Threat Analysis',
      mentor: 'Wei Jian Lim',
      mentorUserId: MENTOR_EMAIL,
      skills: ['Cybersecurity', 'Python', 'Data Analytics', 'OSINT'],
      discipline: 'Cybersecurity',
      description:
        'Build a threat-intelligence dashboard that aggregates open-source indicators and correlates them with internal alerts.',
      slots: 4,
      matched: 3,
      recommendedShortlistMin: 3,
      recommendedShortlistMax: 5,
      status: 'confirmed',
      programme: MENTOR_PROGRAMME_ID,
      programmeName: 'University Internship 2026',
      pc: 'PC4',
      techDomain: 'Cyber',
      educationLevel: MENTOR_EDUCATION_LEVEL,
      internshipDuration: '3',
      internshipPeriodStart: 'May26',
      internshipPeriodEnd: 'Aug26',
      workingLocation: 'Hybrid',
      requiresDce: false,
    },
    {
      id: MENTOR_PROJECT_AIOPS,
      title: 'AI Ops Automation',
      mentor: 'Wei Jian Lim',
      mentorUserId: MENTOR_EMAIL,
      skills: ['Machine Learning', 'MLOps', 'Python', 'Cloud'],
      discipline: 'Artificial Intelligence',
      description:
        'Prototype an anomaly-detection pipeline that predicts service degradation from telemetry logs.',
      slots: 2,
      matched: 0,
      recommendedShortlistMin: 2,
      recommendedShortlistMax: 4,
      status: 'confirmed',
      programme: MENTOR_PROGRAMME_ID,
      programmeName: 'University Internship 2026',
      pc: 'PC4',
      techDomain: 'AI',
      educationLevel: MENTOR_EDUCATION_LEVEL,
      internshipDuration: '4',
      internshipPeriodStart: 'May26',
      internshipPeriodEnd: 'Aug26',
      workingLocation: 'On-site',
      requiresDce: false,
    },
    {
      id: MENTOR_PROJECT_CLOSED,
      title: 'Legacy Vulnerability Scanner',
      mentor: 'Wei Jian Lim',
      mentorUserId: MENTOR_EMAIL,
      skills: ['Cybersecurity', 'Java', 'Static Analysis'],
      discipline: 'Cybersecurity',
      description: 'A completed project retained for reference and reporting.',
      slots: 0,
      matched: 0,
      status: 'confirmed',
      archived: true,
      archivedAt: '2026-01-15',
      archivedBy: 'IO Admin',
      archiveRemark: 'Project no longer offered for this intake.',
      programme: MENTOR_PROGRAMME_ID,
      programmeName: 'University Internship 2026',
      pc: 'PC4',
      techDomain: 'Cyber',
      educationLevel: MENTOR_EDUCATION_LEVEL,
      internshipDuration: '3',
      internshipPeriodStart: 'May26',
      internshipPeriodEnd: 'Aug26',
      workingLocation: 'Hybrid',
      requiresDce: false,
    },
  ];
}

function defaultScores(projectIds: string[]): SuitabilityScore[] {
  return projectIds.map((projectId, index) => ({
    projectId,
    projectTitle: projectId === MENTOR_PROJECT_CYPHER
      ? 'Cybersecurity Threat Analysis'
      : projectId === MENTOR_PROJECT_AIOPS
        ? 'AI Ops Automation'
        : 'Mentor UT Project',
    score: 85 - index * 5,
    reasoning: 'Strong academic profile and relevant coursework.',
  }));
}

function baseApplicant(
  id: string,
  name: string,
  base: { school: string; course: string; year: number; gpa: number } & Partial<Application>,
): Application {
  const email = `${name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')}@example.com`;
  const projectIds = [MENTOR_PROJECT_CYPHER, MENTOR_PROJECT_AIOPS];
  const { school, course, year, gpa, ...overrides } = base;

  return {
    id,
    programmeId: MENTOR_PROGRAMME_ID,
    programmeName: 'University Internship 2026',
    internCategory: MENTOR_EDUCATION_LEVEL,
    status: 'Shortlisted for Interview',
    appliedDate: '2026-07-01',
    name,
    email,
    school,
    course,
    year,
    gpa,
    eligibilityPass: true,
    failedCriteria: [],
    projectRankings: projectIds,
    suitabilityScores: defaultScores(projectIds),
    previousDSTA: false,
    achievements: [],
    funAnswer: '',
    cvFileName: `CV_${name.replace(/\s+/g, '_')}.pdf`,
    cvFileSize: '1.1 MB',
    transcriptFileName: `Transcript_${name.replace(/\s+/g, '_')}.pdf`,
    transcriptFileSize: '2.4 MB',
    ...overrides,
  };
}

export function mentorSharedInterviewSessions(): SharedInterviewSession[] {
  return [
    {
      id: MENTOR_SESSION_ETHAN,
      projectId: MENTOR_PROJECT_CYPHER,
      date: '2026-07-24',
      time: '10:00',
      duration: '1 hour',
      location: 'Meeting room 4B',
      capacity: 1,
      invitedApplicantIds: ['ut-mentor-ethan'],
      confirmedApplicantIds: ['ut-mentor-ethan'],
      status: 'confirmed',
    },
  ];
}

export function mentorApplications(): Application[] {
  return [
    baseApplicant('ut-mentor-nadia', 'Nadia Hassan', {
      school: 'National University of Singapore',
      course: 'Computer Science',
      year: 4,
      gpa: 3.8,
      status: 'Shortlisted for Interview',
      shortlistedFor: MENTOR_PROJECT_CYPHER,
      interviewDueDate: '2026-08-19',
      notes: 'Available from 20 July. Prefers afternoon interviews.',
      projectFitSummary:
        'Strong alignment with threat analysis and defensive cybersecurity.',
      cvFileName: 'CV_Nadia_Hassan.pdf',
      transcriptFileName: 'Transcript_Nadia_Hassan.pdf',
    }),
    baseApplicant('ut-mentor-isaac', 'Isaac Ng', {
      school: 'National University of Singapore',
      course: 'Information Security',
      year: 3,
      gpa: 3.6,
      status: 'Shortlisted for Interview',
      shortlistedFor: MENTOR_PROJECT_CYPHER,
      interviewSetupMethod: 'scheduled',
      interviewSlots: [
        { date: '2026-07-20', time: '14:30', duration: '1 hour' },
        { date: '2026-07-21', time: '10:00', duration: '1 hour' },
        { date: '2026-07-22', time: '15:00', duration: '1 hour' },
      ],
      interviewSlotsSentAt: '2026-07-24',
      interviewDueDate: '2026-08-18',
      cvFileName: 'CV_Isaac_Ng.pdf',
      transcriptFileName: 'Transcript_Isaac_Ng.pdf',
    }),
    baseApplicant('ut-mentor-ethan', 'Ethan Lim', {
      school: 'Singapore Management University',
      course: 'Information Systems',
      year: 3,
      gpa: 3.7,
      status: 'Interview Scheduled',
      shortlistedFor: MENTOR_PROJECT_CYPHER,
      interviewSetupMethod: 'shared',
      sharedSessionId: MENTOR_SESSION_ETHAN,
      meetingLink: 'Meeting room 4B',
      interviewDueDate: '2026-08-17',
      cvFileName: 'CV_Ethan_Lim.pdf',
      transcriptFileName: 'Transcript_Ethan_Lim.pdf',
    }),
    baseApplicant('ut-mentor-marcus', 'Marcus Chia', {
      school: 'Nanyang Technological University',
      course: 'Computer Engineering',
      year: 3,
      gpa: 3.5,
      status: 'Shortlisted for Interview',
      shortlistedFor: MENTOR_PROJECT_CYPHER,
      interviewSetupMethod: 'scheduled',
      interviewSlots: [
        { date: '2026-07-20', time: '14:30', duration: '1 hour' },
        { date: '2026-07-21', time: '10:00', duration: '1 hour' },
        { date: '2026-07-22', time: '15:00', duration: '1 hour' },
      ],
      interviewSlotsSentAt: '2026-07-24',
      rescheduleNote:
        'Original slot no longer works. Please arrange another time.',
      rescheduleNoteDate: '2026-07-24',
      interviewDueDate: '2026-08-19',
      cvFileName: 'CV_Marcus_Chia.pdf',
      transcriptFileName: 'Transcript_Marcus_Chia.pdf',
    }),
    baseApplicant('ut-mentor-chloe', 'Chloe Tan', {
      school: 'Singapore University of Technology and Design',
      course: 'Computer Science and Design',
      year: 4,
      gpa: 3.9,
      status: 'Interview Completed',
      shortlistedFor: MENTOR_PROJECT_CYPHER,
      interviewSetupMethod: 'scheduled',
      interviewSlots: [
        { date: '2026-07-21', time: '10:00', duration: '45 min' },
      ],
      confirmedSlot: 0,
      mentorNotes:
        'Strong technical depth and clear communication during scenario discussion.',
      mentorTranscript:
        'Mock transcript for UT-04: candidate walked through a threat-modelling exercise and demonstrated clear risk prioritisation.',
      projectFitSummary: 'Interview completed. Evidence supports a strong project match.',
      cvFileName: 'CV_Chloe_Tan.pdf',
      transcriptFileName: 'Transcript_Chloe_Tan.pdf',
    }),
    baseApplicant('ut-mentor-daniel', 'Daniel Wong Kai Le', {
      school: 'National University of Singapore',
      course: 'Computer Science',
      year: 4,
      gpa: 3.9,
      status: 'Offer Extended',
      shortlistedFor: MENTOR_PROJECT_CYPHER,
      mentorDecision: 'Accepted',
      mentorScores: {
        technicalKnowledge: 8.5,
        problemSolving: 8,
        communication: 8.5,
        initiativeDrive: 8,
      },
      mentorAiSummary:
        'Daniel is a strong candidate with deep technical knowledge and clear communication.',
      interviewDueDate: '2026-07-16',
      cvFileName: 'CV_Daniel_Wong_Kai_Le.pdf',
      transcriptFileName: 'Transcript_Daniel_Wong_Kai_Le.pdf',
    }),
    baseApplicant('ut-mentor-priya', 'Priya Nair', {
      school: 'National University of Singapore',
      course: 'Data Science and Analytics',
      year: 3,
      gpa: 3.7,
      status: 'Shortlisted for Interview',
      shortlistedFor: MENTOR_PROJECT_AIOPS,
      interviewDueDate: '2026-08-25',
      cvFileName: 'CV_Priya_Nair.pdf',
      transcriptFileName: 'Transcript_Priya_Nair.pdf',
    }),
    baseApplicant('ut-mentor-ryan', 'Ryan Koh', {
      school: 'Singapore Management University',
      course: 'Information Systems',
      year: 3,
      gpa: 3.6,
      status: 'Shortlisted for Interview',
      shortlistedFor: MENTOR_PROJECT_AIOPS,
      interviewDueDate: '2026-08-26',
      cvFileName: 'CV_Ryan_Koh.pdf',
      transcriptFileName: 'Transcript_Ryan_Koh.pdf',
    }),
  ];
}

function upsertById<T extends { id: string }>(records: T[], updates: T[]): T[] {
  const updateIds = new Set(updates.map(r => r.id));
  const kept = records.filter(r => !updateIds.has(r.id));
  return [...kept, ...updates];
}

/**
 * Idempotently seed mentor fixtures into localStorage.
 *
 * Safe to call on every Mentor page mount: fixture records are upserted by ID,
 * while user-created records (those without a matching fixture ID) are left untouched.
 */
export function seedMentorFixtures(): void {
  if (typeof window === 'undefined') return;

  upsertProgrammes([mentorProgramme()]);

  const projects = loadProjects();
  const fixtureProjectIds = new Set(mentorProjects().map(p => p.id));
  const hasFixtures = projects.some(p => fixtureProjectIds.has(p.id));

  if (!hasFixtures) {
    saveProjects(upsertById(projects, mentorProjects()));
  }

  const apps = loadApplications();
  saveApplications(upsertById(apps, mentorApplications()));

  const sessions = loadSharedInterviewSessions();
  saveSharedInterviewSessions(upsertById(sessions, mentorSharedInterviewSessions()));
}
