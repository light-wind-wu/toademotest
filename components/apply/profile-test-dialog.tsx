'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { ProfileDatePicker, ProfileInput, ProfileSelect } from '@/components/apply/profile-fields';
import { PROFILE_EXAMS, profileTestSchema } from '@/lib/applicant-profile';
import type { ProfileTestScore } from '@/lib/types';

export default function ProfileTestDialog({ initial, adding, onClose, onSave }: {
  initial: ProfileTestScore;
  adding: boolean;
  onClose: () => void;
  onSave: (value: ProfileTestScore) => void;
}) {
  const [draft, setDraft] = useState<ProfileTestScore>(() => ({ ...initial }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  function change(patch: Partial<ProfileTestScore>) {
    setDraft((current) => ({ ...current, ...patch })); setErrors({}); setSaveError('');
  }
  function save() {
    const result = profileTestSchema.safeParse(draft);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message])));
      return;
    }
    try { onSave(result.data); }
    catch { setSaveError('Your changes could not be saved. Please try again.'); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
      <div className="border-b border-border px-6 py-5"><DialogTitle>{adding ? 'Add test score' : 'Edit test score'}</DialogTitle></div>
      <form ref={formRef} noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); save(); }}>
        <div className="grid min-h-0 grid-cols-2 gap-x-6 gap-y-5 overflow-y-auto p-6">
          <ProfileSelect id={`${draft.id}-exam`} label="Exam" value={draft.exam} options={PROFILE_EXAMS} onChange={(exam) => change({ exam: exam as ProfileTestScore['exam'] })} error={errors.exam} />
          <ProfileDatePicker id={`${draft.id}-testDate`} label="Test date" required value={draft.testDate} maxDate={new Date().toISOString().slice(0, 10)} onChange={(testDate) => change({ testDate })} error={errors.testDate} />
          <ProfileInput id={`${draft.id}-score`} label="Total score" required value={draft.score} onChange={(score) => change({ score })} error={errors.score} />
        </div>
        {saveError && <p role="alert" className="px-6 pb-4 text-body-sm text-danger">{saveError}</p>}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
