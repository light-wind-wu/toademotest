/**
 * IO Shortlist Task 1 fixtures.
 *
 * The JSON seed files remain the source of truth. This module only defines
 * which records belong to the scenario and returns defensive copies for reset.
 */

import type { Application, EducationLevel, Programme, ProjectEntry } from '@/lib/types';
import applicationsSeed from '@/data/applications.json';
import programmesSeed from '@/data/programmes.json';
import projectsSeed from '@/data/projects.json';

export type IoShortlistCategoryFixture = {
  year: string;
  category: EducationLevel;
  windowValue: string;
  programmeId: string;
  intakeId: string;
  projectIds: string[];
  applicantIds: string[];
};

export const IO_SHORTLIST_CATEGORIES: IoShortlistCategoryFixture[] = [
  {
    year: '2026',
    category: 'Undergraduate Student',
    windowValue: 'Undergraduate Student-2026-1',
    programmeId: 'PROG-0009',
    intakeId: 'INT-0009-2',
    projectIds: ['swarm', 'cyber'],
    applicantIds: ['marcus', 'amelia', 'kenji', 'wei', 'priya', 'daniel-ong', 'sofia-rahman'],
  },
  {
    year: '2026',
    category: 'Tech UP',
    windowValue: 'Tech UP-2026-1',
    programmeId: 'PROG-0010',
    intakeId: 'INT-0010-2',
    projectIds: ['techup-autonomy', 'techup-cloud'],
    applicantIds: [
      'farhan-techup', 'nadia-techup', 'zhihao-techup', 'aarav-techup',
      'meilin-techup', 'ethan-techup', 'nurul-techup',
    ],
  },
  {
    year: '2026',
    category: 'Polytechnic Scholar/Polytechnic Student',
    windowValue: 'Polytechnic Scholar/Polytechnic Student-2026-0',
    programmeId: 'PROG-0011',
    intakeId: 'INT-0011-1',
    projectIds: ['poly-radar', 'poly-maintenance'],
    applicantIds: [
      'hakim-poly', 'chloe-poly', 'jonas-poly', 'alyssa-poly',
      'bryan-poly', 'kavya-poly', 'syafiq-poly',
    ],
  },
];

export const IO_SHORTLIST_PROJECT_IDS = IO_SHORTLIST_CATEGORIES.flatMap(fixture => fixture.projectIds);
export const IO_SHORTLIST_APPLICANT_IDS = IO_SHORTLIST_CATEGORIES.flatMap(fixture => fixture.applicantIds);
export const IO_SHORTLIST_PROGRAMME_IDS = IO_SHORTLIST_CATEGORIES.map(fixture => fixture.programmeId);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function ioShortlistProgrammes(): Programme[] {
  const fixtures = (programmesSeed as unknown as Programme[]).filter(programme =>
    IO_SHORTLIST_PROGRAMME_IDS.includes(programme.id),
  );
  if (fixtures.length !== IO_SHORTLIST_PROGRAMME_IDS.length) {
    throw new Error('IO Shortlist programme fixtures are incomplete.');
  }
  return clone(fixtures);
}

export function ioShortlistProjects(): ProjectEntry[] {
  const fixtures = (projectsSeed as unknown as ProjectEntry[]).filter(project =>
    IO_SHORTLIST_PROJECT_IDS.includes(project.id),
  );
  if (fixtures.length !== IO_SHORTLIST_PROJECT_IDS.length) {
    throw new Error('IO Shortlist project fixtures are incomplete.');
  }
  return clone(fixtures);
}

export function ioShortlistApplications(): Application[] {
  const fixtures = (applicationsSeed as unknown as Application[]).filter(application =>
    IO_SHORTLIST_APPLICANT_IDS.includes(application.id),
  );
  if (fixtures.length !== IO_SHORTLIST_APPLICANT_IDS.length) {
    throw new Error('IO Shortlist applicant fixtures are incomplete.');
  }
  return clone(fixtures);
}
