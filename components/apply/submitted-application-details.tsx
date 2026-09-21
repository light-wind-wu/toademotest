import type { ApplicantSubmissionDetails } from '@/lib/types';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] leading-5 text-fg-muted">{label}</dt>
      <dd className="mt-1 break-words text-[14px] font-medium leading-6 text-fg">{value || 'Not provided'}</dd>
    </div>
  );
}

export default function SubmittedApplicationDetails({
  details,
  draft = false,
}: {
  details: ApplicantSubmissionDetails;
  draft?: boolean;
}) {
  const { personal, education, availability, additional } = details;
  const grid = 'mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2';
  const section = 'border-b border-border py-6 first:pt-0';
  const heading = 'text-[18px] font-semibold leading-6 text-fg';

  return (
    <div className="min-w-0" aria-label={draft ? 'Application details' : 'Submitted application details'}>
      <section className={section} aria-labelledby="application-personal">
        <h2 id="application-personal" className={heading}>Personal details</h2>
        <dl className={grid}>
          <Field label="Full name" value={personal.name} />
          <Field label="NRIC" value={personal.nric} />
          <Field label="Nationality" value={personal.nationality} />
          <Field label="Residential status" value={personal.residentialStatus} />
          <Field label="Sex" value={personal.sex} />
          <Field label="Date of birth" value={personal.dateOfBirth} />
          <Field label="Race" value={personal.race} />
          <Field label="Photo" value={personal.photo} />
        </dl>
        <h3 className="mt-6 text-[15px] font-semibold text-fg">Contact details</h3>
        <dl className={grid}>
          <Field label="Mobile number" value={personal.mobile} />
          <Field label="Email" value={personal.email} />
          <div className="sm:col-span-2"><Field label="Registered address" value={personal.registeredAddress} /></div>
        </dl>
      </section>

      <section className={section} aria-labelledby="application-education">
        <h2 id="application-education" className={heading}>Education</h2>
        <dl className={grid}>
          <Field label="Institution" value={education.institution} />
          <Field label="Course of study" value={education.course} />
          <Field label="Year of study" value={education.yearOfStudy} />
          <Field label="GPA" value={education.gpa} />
          <Field label="Expected graduation" value={education.expectedGraduation} />
        </dl>
      </section>

      <section className={section} aria-labelledby="application-availability">
        <h2 id="application-availability" className={heading}>Availability</h2>
        <dl className={grid}>
          <Field label="Preferred internship start date" value={availability.startDate} />
          <Field label="Preferred internship end date" value={availability.endDate} />
        </dl>
      </section>

      <section className={section} aria-labelledby="application-preferences">
        <h2 id="application-preferences" className={heading}>Project preferences</h2>
        <dl className="mt-4"><Field label="Areas of interest" value={details.interests.join(', ')} /></dl>
        <h3 className="mt-5 text-[13px] font-medium text-fg-muted">Ranked project preferences</h3>
        {details.projectPreferences.length ? (
          <ol className="mt-2 divide-y divide-border" aria-label="Ranked project preferences">
            {details.projectPreferences.map((project, index) => (
              <li key={`${index}-${project}`} className="flex items-start gap-3 py-3 text-[14px] leading-6 text-fg">
                <span className="w-6 shrink-0 font-semibold text-fg-muted">{index + 1}.</span>
                <span className="min-w-0 break-words">{project}</span>
              </li>
            ))}
          </ol>
        ) : <p className="mt-2 text-[14px] text-fg-muted">No project preferences provided.</p>}
      </section>

      <section className={section} aria-labelledby="application-additional">
        <h2 id="application-additional" className={heading}>Additional details</h2>
        <dl className={grid}>
          <Field label="Bonded scholarship recipient" value={additional.bondedScholarship === null ? 'Not applicable' : additional.bondedScholarship ? 'Yes' : 'No'} />
          <Field label="Scholarship name" value={additional.bondedScholarship ? additional.scholarshipName : 'Not applicable'} />
          <Field label="Credit-bearing internship" value={additional.creditBearing ? 'Yes' : 'No'} />
          <Field label="School requirements / module code" value={additional.creditBearing ? additional.creditModuleCode : 'Not applicable'} />
        </dl>
      </section>

      <section className="py-6" aria-labelledby="application-declarations">
        <h2 id="application-declarations" className={heading}>Declarations</h2>
        <ul className="mt-4 space-y-5">
          {details.declarations.map((declaration) => (
            <li key={declaration.text}>
              <p className="text-[14px] leading-6 text-fg">{declaration.text}</p>
              <p className="mt-1 text-[12px] text-fg-muted">
                {draft || !declaration.acceptedAt ? 'Not yet confirmed' : `Confirmed on ${declaration.acceptedAt}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
