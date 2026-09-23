'use client';

import { ProfileInput, ProfileMonthPicker, ProfileSelect } from '@/components/apply/profile-fields';
import { PROFILE_QUALIFICATIONS, PROFILE_STUDY_STATUSES, hasProfileProgramme } from '@/lib/applicant-profile';
import type { ProfileEducation } from '@/lib/types';
import seed from '@/data/applicant-profile.json';

export default function ProfileEducationEditor({ value, onChange, errors }: {
  value: ProfileEducation; onChange: (value: ProfileEducation) => void; errors: Record<string, string>;
}) {
  const change = <K extends keyof ProfileEducation>(key: K, next: ProfileEducation[K]) => onChange({ ...value, [key]: next });
  const studying = value.status === 'Currently studying';
  return (
    <div className="space-y-6">
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <ProfileSelect id={`${value.id}-qualification`} label="Education level" value={value.qualification} options={PROFILE_QUALIFICATIONS}
          onChange={(next) => change('qualification', next as ProfileEducation['qualification'])} error={errors.qualification} />
        <ProfileSelect id={`${value.id}-status`} label="Study status" required={false} value={value.status} options={PROFILE_STUDY_STATUSES}
          onChange={(next) => change('status', next as ProfileEducation['status'])} error={errors.status} />
        <ProfileInput id={`${value.id}-institution`} label="Institution name" required value={value.institution} suggestions={seed.institutions}
          onChange={(next) => change('institution', next)} error={errors.institution} />
        <ProfileInput id={`${value.id}-country`} label="Country" required value={value.country} suggestions={seed.countries}
          onChange={(next) => change('country', next)} error={errors.country} />
        {hasProfileProgramme(value.qualification) && <ProfileInput id={`${value.id}-course`} label="Course / Programme of study" value={value.course}
          onChange={(next) => change('course', next)} error={errors.course} />}
        {studying && <ProfileInput id={`${value.id}-currentYear`} label="Current year" value={value.currentYear}
          suggestions={['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6']} onChange={(next) => change('currentYear', next)} error={errors.currentYear} />}
        <ProfileMonthPicker id={`${value.id}-startDate`} label="Start date" value={value.startDate} onChange={(next) => change('startDate', next)} error={errors.startDate} />
        {studying
          ? <ProfileMonthPicker id={`${value.id}-expectedGraduation`} label="Expected graduation date" value={value.expectedGraduation} minMonth={value.startDate} onChange={(next) => change('expectedGraduation', next)} error={errors.expectedGraduation} />
          : <ProfileMonthPicker id={`${value.id}-endDate`} label={value.status === 'Completed' ? 'Graduation date' : 'End date'} value={value.endDate} minMonth={value.startDate} onChange={(next) => change('endDate', next)} error={errors.endDate} />}
        {value.qualification === 'Undergraduate' && <>
          <ProfileInput id={`${value.id}-major`} label="Major" value={value.major} onChange={(next) => change('major', next)} error={errors.major} />
          <ProfileInput id={`${value.id}-secondMajor`} label="Second major" value={value.secondMajor} onChange={(next) => change('secondMajor', next)} error={errors.secondMajor} />
          <ProfileInput id={`${value.id}-minor`} label="Minor" value={value.minor} onChange={(next) => change('minor', next)} error={errors.minor} />
        </>}
      </div>
      {value.legacyGraduationYear && !value.expectedGraduation && !value.endDate && <p className="text-body-sm text-fg-muted">Previously recorded graduation year: {value.legacyGraduationYear}</p>}
    </div>
  );
}
