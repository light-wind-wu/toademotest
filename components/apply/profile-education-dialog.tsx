'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import ProfileEducationEditor from '@/components/apply/profile-education-editor';
import { profileEducationSchema } from '@/lib/applicant-profile';
import type { ProfileEducation } from '@/lib/types';

export default function ProfileEducationDialog({ initial, adding, onClose, onSave }: {
  initial: ProfileEducation;
  adding: boolean;
  onClose: () => void;
  onSave: (value: ProfileEducation) => void;
}) {
  const [draft, setDraft] = useState<ProfileEducation>(() => ({ ...initial }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  function save() {
    const result = profileEducationSchema.safeParse(draft);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      return;
    }
    try { onSave(result.data); }
    catch { setSaveError('Your changes could not be saved. Please try again.'); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
      <div className="border-b border-border px-6 py-5"><DialogTitle>{adding ? 'Add education' : 'Edit education'}</DialogTitle></div>
      <form ref={formRef} noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); save(); }}>
        <div className="min-h-0 overflow-y-auto p-6">
          <ProfileEducationEditor value={draft} errors={errors} onChange={(value) => { setDraft(value); setErrors({}); setSaveError(''); }} />
        </div>
        {saveError && <p role="alert" className="px-6 pb-4 text-body-sm text-danger">{saveError}</p>}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
