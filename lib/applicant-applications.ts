import applicantApplicationsSeed from '@/data/applicant-applications.json';
import type { ApplicantApplicationRecord } from '@/lib/types';

const APPLICANT_APPLICATIONS_KEY = 'dsta_applicant_application_records';

function hideInternalApplicantStatuses(record: ApplicantApplicationRecord): ApplicantApplicationRecord {
  return {
    ...record,
    timeline: record.timeline.map((item) =>
      item.title.toLowerCase() === 'shortlisted for interview'
        ? { ...item, title: 'Application progressed' }
        : item,
    ),
  };
}

export function loadApplicantApplications(): ApplicantApplicationRecord[] {
  if (typeof window === 'undefined') return applicantApplicationsSeed as ApplicantApplicationRecord[];

  try {
    const stored = localStorage.getItem(APPLICANT_APPLICATIONS_KEY);
    if (stored) {
      const savedRecords = JSON.parse(stored) as ApplicantApplicationRecord[];
      const savedById = new Map(savedRecords.map((record) => [record.id, record]));
      const merged = (applicantApplicationsSeed as ApplicantApplicationRecord[]).map((seedRecord) => ({
        ...seedRecord,
        ...savedById.get(seedRecord.id),
        interviewDetails: savedById.get(seedRecord.id)?.interviewDetails ?? seedRecord.interviewDetails,
      }));
      const seedIds = new Set(merged.map((record) => record.id));
      return [...merged, ...savedRecords.filter((record) => !seedIds.has(record.id))].map(hideInternalApplicantStatuses);
    }
    localStorage.setItem(APPLICANT_APPLICATIONS_KEY, JSON.stringify(applicantApplicationsSeed));
  } catch {
    return applicantApplicationsSeed as ApplicantApplicationRecord[];
  }

  return (applicantApplicationsSeed as ApplicantApplicationRecord[]).map(hideInternalApplicantStatuses);
}

export function saveApplicantApplications(records: ApplicantApplicationRecord[]) {
  localStorage.setItem(APPLICANT_APPLICATIONS_KEY, JSON.stringify(records));
}
