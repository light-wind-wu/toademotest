import applicantInternshipSeed from '@/data/applicant-internship.json';
import type {
  ApplicantInternshipFeedback,
  ApplicantInternshipPhase,
  ApplicantInternshipRecord,
} from '@/lib/types';

export const APPLICANT_INTERNSHIP_KEY = 'dsta_applicant_internship_records';

export function loadApplicantInternshipRecords(): ApplicantInternshipRecord[] {
  const seed = applicantInternshipSeed as ApplicantInternshipRecord[];
  if (typeof window === 'undefined') return seed;

  try {
    const stored = localStorage.getItem(APPLICANT_INTERNSHIP_KEY);
    if (stored) {
      const savedRecords = JSON.parse(stored) as ApplicantInternshipRecord[];
      const savedByPhase = new Map(savedRecords.map((record) => [record.phase, record]));
      return seed.map((record) => {
        const savedRecord = savedByPhase.get(record.phase);
        return {
          ...record,
          ...savedRecord,
          completionTasks: record.completionTasks.map((task) => {
            const savedTask = savedRecord?.completionTasks.find((candidate) => candidate.id === task.id);
            return savedTask
              ? { ...task, status: savedTask.status, statusTone: savedTask.statusTone }
              : task;
          }),
        };
      });
    }
    localStorage.setItem(APPLICANT_INTERNSHIP_KEY, JSON.stringify(seed));
  } catch {
    return seed;
  }

  return seed;
}

export function loadApplicantInternshipRecord(
  phase: ApplicantInternshipPhase,
): ApplicantInternshipRecord {
  const records = loadApplicantInternshipRecords();
  return records.find((record) => record.phase === phase) ?? records[0];
}

export function saveApplicantInternshipRecords(records: ApplicantInternshipRecord[]) {
  localStorage.setItem(APPLICANT_INTERNSHIP_KEY, JSON.stringify(records));
}

export function saveApplicantInternshipFeedback(
  applicationId: string,
  feedback: ApplicantInternshipFeedback,
): ApplicantInternshipRecord | null {
  const records = loadApplicantInternshipRecords();
  let updatedRecord: ApplicantInternshipRecord | null = null;
  const updatedRecords = records.map((record) => {
    if (record.phase !== 'offboarding' || record.applicationId !== applicationId) return record;
    updatedRecord = { ...record, feedback };
    return updatedRecord;
  });
  saveApplicantInternshipRecords(updatedRecords);
  return updatedRecord;
}
