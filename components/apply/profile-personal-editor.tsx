'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ProfileDatePicker, ProfileInput, ProfileSelect } from '@/components/apply/profile-fields';
import { PROFILE_SEX_OPTIONS, profilePersonalSchema } from '@/lib/applicant-profile';
import type { ProfilePersonalInformation } from '@/lib/types';
import seed from '@/data/applicant-profile.json';

export default function ProfilePersonalEditor({ initial, onClose, onSave }: {
  initial: ProfilePersonalInformation;
  onClose: () => void;
  onSave: (value: ProfilePersonalInformation) => void;
}) {
  const [draft, setDraft] = useState<ProfilePersonalInformation>(() => ({ ...initial }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  function change(key: keyof ProfilePersonalInformation, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors({}); setSaveError('');
  }
  function save() {
    const result = profilePersonalSchema.safeParse(draft);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      return;
    }
    try { onSave(result.data); }
    catch { setSaveError('Your changes could not be saved. Please try again.'); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
      <div className="border-b border-border px-6 py-5"><DialogTitle>Edit personal information</DialogTitle></div>
      <form ref={formRef} noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); save(); }}>
        <div className="grid min-h-0 grid-cols-2 gap-x-6 gap-y-5 overflow-y-auto p-6">
          <ProfileInput id="profile-name" label="Name" required value={draft.fullName} onChange={(value) => change('fullName', value)} error={errors.fullName} autoComplete="name" autoFocus />
          <ProfileInput id="profile-nric" label="NRIC / FIN" required value={draft.nric} onChange={() => {}} readOnly disabled error={errors.nric} maxLength={9} />
          <ProfileInput id="profile-nationality" label="Nationality" required value={draft.nationality} onChange={(value) => change('nationality', value)} error={errors.nationality} />
          <ProfileInput id="profile-country-of-birth" label="Country of birth" required value={draft.countryOfBirth} onChange={(value) => change('countryOfBirth', value)} error={errors.countryOfBirth} suggestions={seed.countries} />
          <ProfileDatePicker id="profile-date-of-birth" label="Date of birth" required value={draft.dateOfBirth} onChange={(value) => change('dateOfBirth', value)} error={errors.dateOfBirth} maxDate={format(new Date(), 'yyyy-MM-dd')} />
          <ProfileSelect id="profile-sex" label="Sex" required value={draft.sex} options={PROFILE_SEX_OPTIONS} onChange={(value) => change('sex', value)} error={errors.sex} />
          <ProfileInput id="profile-phone" label="Mobile number" required type="tel" value={draft.phone} onChange={(value) => change('phone', value)} error={errors.phone} autoComplete="tel" />
          <ProfileInput id="profile-email" label="Email" required type="email" value={draft.email} onChange={() => {}} readOnly disabled error={errors.email} autoComplete="email" />
          <ProfileInput id="profile-residential-status" label="Residential status" required value={draft.residentialStatus} suggestions={['Citizen', 'Permanent Resident', 'Foreigner']} onChange={(value) => change('residentialStatus', value)} error={errors.residentialStatus} />
          <div className="col-span-2"><ProfileInput id="profile-registered-address" label="Registered address" required value={draft.registeredAddress} onChange={(value) => change('registeredAddress', value)} error={errors.registeredAddress} autoComplete="street-address" maxLength={500} /></div>
        </div>
        {saveError && <p role="alert" className="px-6 pb-4 text-body-sm text-danger">{saveError}</p>}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
