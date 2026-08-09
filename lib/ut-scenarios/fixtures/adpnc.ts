/**
 * AD (P&C) usability-test fixtures.
 *
 * All stable IDs follow the convention `ut-adpnc-{entity}-{sequence}`.
 * These fixtures are owned by the AD (P&C) catalog tasks and are reset
 * idempotently by `resetUtScenario()`.
 */

import type {
  EducationLevel,
  ProjectRequest,
  ProjectSubmissionBatch,
  RequestStatus,
  SubmittedProject,
} from '@/lib/types';

export const AD_PNC_PC3 = 'PC3' as const;
export const AD_PNC_PC3_HEAD_EMAIL = 'james.tan@dsta.gov.sg';
export const AD_PNC_PC3_HEAD_NAME = 'James Tan';
export const AD_PNC_PC3_PC_EMAIL = 'james.tan@dsta.gov.sg';
export const AD_PNC_PC3_AD_PNC_EMAIL = 'shuqi.ng@dsta.gov.sg';
export const AD_PNC_PC3_AD_PNC_NAME = 'Ng Shu Qi';
export const AD_PNC_SENDER_NAME = 'Davina Tan';

export const TASK_1_OPEN_REQUEST_ID = 'ut-adpnc-submit-request-01';
export const TASK_1_OPEN_TOKEN = 'ut-adpnc-submit-token-01';
export const TASK_1_CLOSED_REQUEST_1_ID = 'ut-adpnc-closed-request-01';
export const TASK_1_CLOSED_TOKEN_1 = 'ut-adpnc-closed-token-01';
export const TASK_1_CLOSED_REQUEST_2_ID = 'ut-adpnc-closed-request-02';
export const TASK_1_CLOSED_TOKEN_2 = 'ut-adpnc-closed-token-02';

export const TASK_2_OPEN_REQUEST_ID = 'ut-adpnc-amend-request-01';
export const TASK_2_OPEN_TOKEN = 'ut-adpnc-amend-token-01';
export const TASK_2_BATCH_ID = 'ut-adpnc-amend-batch-01';
export const TASK_2_CLOSED_REQUEST_1_ID = 'ut-adpnc-amend-closed-request-01';
export const TASK_2_CLOSED_TOKEN_1 = 'ut-adpnc-amend-closed-token-01';
export const TASK_2_CLOSED_REQUEST_2_ID = 'ut-adpnc-amend-closed-request-02';
export const TASK_2_CLOSED_TOKEN_2 = 'ut-adpnc-amend-closed-token-02';

export const TASK_1_TOKENS = [
  TASK_1_OPEN_TOKEN,
  TASK_1_CLOSED_TOKEN_1,
  TASK_1_CLOSED_TOKEN_2,
];

export const TASK_2_TOKENS = [
  TASK_2_OPEN_TOKEN,
  TASK_2_CLOSED_TOKEN_1,
  TASK_2_CLOSED_TOKEN_2,
];

export const AD_PNC_ALL_TOKENS = [...TASK_1_TOKENS, ...TASK_2_TOKENS];

const UG_EDUCATION: EducationLevel = 'Undergraduate Student';
const TECHUP_EDUCATION: EducationLevel = 'Tech UP';
const POLY_EDUCATION: EducationLevel = 'Polytechnic Scholar/Polytechnic Student';

const SENT_DATE = '2026-07-01';
const OPEN_DEADLINE = '2026-09-30'; // after UT dates
const CLOSED_DEADLINE_1 = '2026-07-31'; // before UT dates
const CLOSED_DEADLINE_2 = '2026-06-30'; // before UT dates

const PERIOD_START = '1 Jan 2027';
const PERIOD_END = '30 Jun 2027';
const CALENDAR_PERIOD = '1 Jan 2027 – 30 Jun 2027';
const DURATION = '2 Months';

function baseRequest(): Omit<ProjectRequest, 'id' | 'uploadToken' | 'educationLevel' | 'placements' | 'status' | 'deadline'> {
  return {
    pc: AD_PNC_PC3_PC_EMAIL,
    programmeCenter: AD_PNC_PC3,
    headName: AD_PNC_PC3_HEAD_NAME,
    senderName: AD_PNC_SENDER_NAME,
    internCategory: UG_EDUCATION,
    calendarPeriod: CALENDAR_PERIOD,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    duration: DURATION,
    created: 0,
    uploaded: 0,
    sentDate: SENT_DATE,
  };
}

export function computeRequestStatus(uploaded: number, placements: number): RequestStatus {
  if (uploaded === 0) return 'pending';
  if (uploaded > placements) return 'excess';
  if (uploaded === placements) return 'matched';
  return 'partial';
}

export const task1OpenRequest = (): ProjectRequest => ({
  ...baseRequest(),
  id: TASK_1_OPEN_REQUEST_ID,
  uploadToken: TASK_1_OPEN_TOKEN,
  educationLevel: UG_EDUCATION,
  placements: 4,
  uploaded: 0,
  status: 'pending',
  deadline: OPEN_DEADLINE,
});

export const task1ClosedRequests = (): ProjectRequest[] => [
  {
    ...baseRequest(),
    id: TASK_1_CLOSED_REQUEST_1_ID,
    uploadToken: TASK_1_CLOSED_TOKEN_1,
    educationLevel: TECHUP_EDUCATION,
    internCategory: TECHUP_EDUCATION,
    placements: 2,
    uploaded: 0,
    status: 'pending',
    deadline: CLOSED_DEADLINE_1,
  },
  {
    ...baseRequest(),
    id: TASK_1_CLOSED_REQUEST_2_ID,
    uploadToken: TASK_1_CLOSED_TOKEN_2,
    educationLevel: POLY_EDUCATION,
    internCategory: POLY_EDUCATION,
    placements: 3,
    uploaded: 0,
    status: 'pending',
    deadline: CLOSED_DEADLINE_2,
  },
];

export const task2OpenRequest = (): ProjectRequest => ({
  ...baseRequest(),
  id: TASK_2_OPEN_REQUEST_ID,
  uploadToken: TASK_2_OPEN_TOKEN,
  educationLevel: UG_EDUCATION,
  placements: 7,
  uploaded: 6,
  status: computeRequestStatus(6, 7),
  deadline: OPEN_DEADLINE,
});

export const task2ClosedRequests = (): ProjectRequest[] => [
  {
    ...baseRequest(),
    id: TASK_2_CLOSED_REQUEST_1_ID,
    uploadToken: TASK_2_CLOSED_TOKEN_1,
    educationLevel: TECHUP_EDUCATION,
    internCategory: TECHUP_EDUCATION,
    placements: 2,
    uploaded: 0,
    status: 'pending',
    deadline: CLOSED_DEADLINE_1,
  },
  {
    ...baseRequest(),
    id: TASK_2_CLOSED_REQUEST_2_ID,
    uploadToken: TASK_2_CLOSED_TOKEN_2,
    educationLevel: POLY_EDUCATION,
    internCategory: POLY_EDUCATION,
    placements: 3,
    uploaded: 0,
    status: 'pending',
    deadline: CLOSED_DEADLINE_2,
  },
];

const baseSubmittedProject = (): Omit<SubmittedProject, 'id' | 'title' | 'description' | 'mentor' | 'mentorAppointment' | 'mentorEmail' | 'mentorUserId' | 'mentorBio' | 'skills' | 'status' | 'remarks' | 'techDomain' | 'emergingArea'> => ({
  requestLineId: TASK_2_OPEN_REQUEST_ID,
  mentorDept: 'DSTA',
  discipline: 'Computer Science / Data Science / Operations Research',
  slots: 1,
  preferredEducation: UG_EDUCATION,
  minGpa: '',
  projectType: 'Technical',
  additionalRequirements: '',
  aiCheck: { grammar: 'pass', level: 'pass', notes: [] },
  pc: AD_PNC_PC3,
  educationLevel: UG_EDUCATION,
  internshipDuration: '2',
  internshipPeriodStart: 'Jan 2027',
  internshipPeriodEnd: 'Jun 2027',
  workingLocation: 'DSTA',
});

export const task2ReturnedProject = (): SubmittedProject => ({
  ...baseSubmittedProject(),
  id: 'ut-adpnc-amend-project-returned',
  title: 'AI-Enabled Defence Logistics Forecasting',
  description:
    'Develop a prototype that uses historical logistics data to forecast equipment demand and identify potential supply shortages. The intern will clean and analyse data, compare forecasting approaches, and evaluate model performance. Deliverables include a working prototype, an evaluation report, and a dashboard presenting key forecasts.',
  mentor: 'Wei Jian Lim',
  mentorAppointment: 'Senior Engineer',
  mentorEmail: 'weijian.lim@dsta.gov.sg',
  mentorUserId: 'mentor-weijian',
  mentorBio: 'Senior engineer focused on applied analytics and logistics modelling.',
  skills: ['Python', 'Data Analysis', 'Machine Learning'],
  status: 'returnedForUpdate',
  remarks:
    'Please narrow the scope to one equipment category, use only anonymised data, and include a baseline comparison for model evaluation.',
  techDomain: 'Digital',
  emergingArea: 'Data Analytics',
});

export const task2PendingProjects = (): SubmittedProject[] => [
  {
    ...baseSubmittedProject(),
    id: 'ut-adpnc-amend-project-pending-01',
    title: 'Cyber Threat Intelligence Automation',
    description:
      'Build a pipeline that ingests open-source threat feeds, deduplicates indicators, and surfaces actionable alerts for the SOC team.',
    mentor: 'Dr. Nadia Rahman',
    mentorAppointment: 'Senior Specialist',
    mentorEmail: 'nadia_rahman@dsta.gov.sg',
    mentorUserId: 'mentor-nadia',
    mentorBio: 'Specialises in threat intelligence and secure automation.',
    skills: ['Python', 'Cyber Security', 'Automation'],
    status: 'pending',
    techDomain: 'Cyber',
    emergingArea: 'Cybersecurity',
  },
  {
    ...baseSubmittedProject(),
    id: 'ut-adpnc-amend-project-pending-02',
    title: 'Autonomous Inspection Drone for Hangar Maintenance',
    description:
      'Develop flight-planning and image-capture logic for a small drone that inspects aircraft hangar structures, with anomaly detection on captured imagery.',
    mentor: 'Dr. Samuel Yeo',
    mentorAppointment: 'Principal Engineer',
    mentorEmail: 'samuel_yeo@dsta.gov.sg',
    mentorUserId: 'mentor-samuel',
    mentorBio: 'Specialises in perception, sensor fusion and mobile robot autonomy.',
    skills: ['Python', 'ROS', 'Computer Vision'],
    status: 'pending',
    techDomain: 'Autonomy',
    emergingArea: 'Robotics & Autonomous Systems',
  },
];

export const task2ApprovedProjects = (): SubmittedProject[] => [
  {
    ...baseSubmittedProject(),
    id: 'ut-adpnc-amend-project-approved-01',
    title: 'Secure Supply Chain Analytics Dashboard',
    description:
      'Prototype a dashboard that visualises supply chain risk signals from structured datasets, with role-based access and export controls.',
    mentor: 'Michael Lim',
    mentorAppointment: 'Lead Engineer',
    mentorEmail: 'michael_lim@dsta.gov.sg',
    mentorUserId: 'mentor-michael',
    mentorBio: 'Engineering lead focused on secure data platforms and dashboards.',
    skills: ['Data Analysis', 'Dashboarding', 'TypeScript'],
    status: 'approved',
    reviewedAt: '2026-07-10',
    reviewedBy: 'Davina Tan',
    techDomain: 'Digital',
    emergingArea: 'Data Analytics',
  },
  {
    ...baseSubmittedProject(),
    id: 'ut-adpnc-amend-project-approved-02',
    title: 'Signal Classification for Spectrum Monitoring',
    description:
      'Train and evaluate machine-learning classifiers that identify radio emitters in congested spectrum, with explainability for analyst review.',
    mentor: 'Ravi Menon',
    mentorAppointment: 'Lead Engineer',
    mentorEmail: 'ravi_menon@dsta.gov.sg',
    mentorUserId: 'mentor-ravi',
    mentorBio: 'Specialises in signal processing and applied machine learning.',
    skills: ['Machine Learning', 'Signal Processing', 'PyTorch'],
    status: 'approved',
    reviewedAt: '2026-07-10',
    reviewedBy: 'Davina Tan',
    techDomain: 'Sensors',
    emergingArea: 'AI/ML',
  },
  {
    ...baseSubmittedProject(),
    id: 'ut-adpnc-amend-project-approved-03',
    title: 'Predictive Maintenance for Mission-Critical Systems',
    description:
      'Develop models that forecast component wear from sensor telemetry to schedule maintenance proactively across mission-critical platforms.',
    mentor: 'Gerald Tan',
    mentorAppointment: 'Senior Engineer',
    mentorEmail: 'gerald_tan@dsta.gov.sg',
    mentorUserId: 'mentor-gerald',
    mentorBio: 'Builds data-driven tools for platform sustainment and readiness.',
    skills: ['Data Analysis', 'Predictive Maintenance', 'Python'],
    status: 'approved',
    reviewedAt: '2026-07-10',
    reviewedBy: 'Davina Tan',
    techDomain: 'Digital',
    emergingArea: 'Data Analytics',
  },
];

export const task2Batch = (): ProjectSubmissionBatch => {
  const projects = [
    task2ReturnedProject(),
    ...task2PendingProjects(),
    ...task2ApprovedProjects(),
  ];
  return {
    id: TASK_2_BATCH_ID,
    uploadToken: TASK_2_OPEN_TOKEN,
    pc: AD_PNC_PC3_PC_EMAIL,
    pcHead: AD_PNC_PC3_HEAD_NAME,
    submittedBy: AD_PNC_PC3_AD_PNC_NAME,
    programme: '',
    educationLevel: UG_EDUCATION,
    requestedEducationLevels: [UG_EDUCATION],
    placements: projects.reduce((sum, p) => sum + p.slots, 0),
    uploadedAt: '2026-07-08',
    projects,
  };
};
