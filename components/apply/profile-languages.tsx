'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui-legacy/select';
import { PROFILE_LANGUAGE_LEVELS, newProfileLanguage, profileLanguagesSchema } from '@/lib/applicant-profile';
import type { ProfileLanguage } from '@/lib/types';
import seed from '@/data/applicant-profile.json';

const fields = [
  ['language', 'Language'], ['speaking', 'Speaking proficiency'],
  ['reading', 'Reading proficiency'], ['writing', 'Writing proficiency'],
] as const;

function LanguageEditor({ initial, adding, otherLanguages, onClose, onSave }: {
  initial: ProfileLanguage; adding: boolean; otherLanguages: string[];
  onClose: () => void; onSave: (value: ProfileLanguage) => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...initial }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  function save() {
    const result = profileLanguagesSchema.safeParse([draft]);
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[1], issue.message])));
      return;
    }
    if (otherLanguages.includes(result.data[0].language)) { setErrors({ language: 'This language is already listed.' }); return; }
    try { onSave(result.data[0]); }
    catch { setSaveError('Your changes could not be saved. Please try again.'); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
      <div className="border-b border-border px-6 py-5"><DialogTitle>{adding ? 'Add language' : 'Edit language'}</DialogTitle></div>
      <form ref={formRef} noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); save(); }}>
        <div className="grid min-h-0 grid-cols-2 gap-x-6 gap-y-5 overflow-y-auto p-6">
          {fields.map(([field, label]) => {
            const id = `profile-language-${field}`;
            return <div key={field} className="min-w-0 space-y-2">
              <label id={`${id}-label`} htmlFor={id} className="block text-body-sm font-medium text-fg">{label}<span className="text-danger"> *</span></label>
              <Select value={draft[field] || null} disabled={field !== 'language' && !draft.language} onValueChange={(value) => {
                const next = value === '__empty__' ? '' : value ?? '';
                setDraft((current) => field === 'language' && !next ? newProfileLanguage() : { ...current, [field]: next });
                setErrors({}); setSaveError('');
              }}>
                <SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-required aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${id}-error` : undefined}>
                  <SelectValue className="min-w-0 truncate" placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Select</SelectItem>
                  {(field === 'language' ? seed.languages : PROFILE_LANGUAGE_LEVELS).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors[field] && <p id={`${id}-error`} role="alert" className="text-body-sm text-danger">{errors[field]}</p>}
            </div>;
          })}
        </div>
        {saveError && <p role="alert" className="px-6 pb-4 text-body-sm text-danger">{saveError}</p>}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function ProfileLanguages({ value, onSave, onRemove }: {
  value: ProfileLanguage[]; onSave: (value: ProfileLanguage, previous: ProfileLanguage | null) => void; onRemove: (value: ProfileLanguage) => void;
}) {
  const [editing, setEditing] = useState<ProfileLanguage | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProfileLanguage | null>(null);
  const [removeError, setRemoveError] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);
  const editRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  function closeEditor() {
    const language = editing?.language;
    setEditing(null); setAdding(false);
    requestAnimationFrame(() => (language && editRefs.current[language] ? editRefs.current[language] : addRef.current)?.focus());
  }
  return <section aria-labelledby="profile-languages" className="min-w-0 py-8">
    <div className="flex items-center justify-between gap-3">
      <h2 id="profile-languages" className="text-headline-sm text-fg">Language Proficiency</h2>
      <Button ref={addRef} variant="outline" size="sm" aria-haspopup="dialog" onClick={() => { setAdding(true); setEditing(newProfileLanguage()); }}><Plus size={16} aria-hidden />Add language</Button>
    </div>
    <p className="mb-5 mt-3 text-body-sm text-fg-muted">Please provide details of the languages you have a proficiency in.</p>
    {!value.length && <p className="py-3 text-body-sm text-fg-muted">No languages added.</p>}
    <div className="space-y-4">
      {value.map((row, index) => <article key={row.language || index} className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-body-md font-semibold text-fg">{row.language || 'Language'}</h3>
            <dl className="mt-2 space-y-1 text-body-sm text-fg-muted">
              {fields.slice(1).map(([field, label]) => <div key={field} className="flex flex-wrap gap-x-1"><dt>{label}:</dt><dd>{row[field] || 'Not provided'}</dd></div>)}
            </dl>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button ref={(element) => { editRefs.current[row.language] = element; }} variant="ghost" size="icon" title="Edit language" aria-label={`Edit language ${index + 1}`} aria-haspopup="dialog" onClick={() => { setAdding(false); setEditing(row); }}><Pencil size={16} /></Button>
            <Button variant="ghost" size="icon" className="text-danger" title="Remove language" aria-label={`Remove language ${index + 1}`} onClick={() => { setRemoveError(''); setRemoving(row); }}><Trash2 size={16} /></Button>
          </div>
        </div>
      </article>)}
    </div>
    {editing && <LanguageEditor initial={editing} adding={adding} otherLanguages={value.filter((row) => adding || row !== editing).map((row) => row.language)} onClose={closeEditor} onSave={(next) => { onSave(next, adding ? null : editing); closeEditor(); }} />}
    <Dialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
      <DialogContent><DialogTitle>Remove this language?</DialogTitle><DialogDescription>This language will be removed from your profile.</DialogDescription>
        {removeError && <p role="alert" className="text-body-sm text-danger">{removeError}</p>}
        <DialogFooter><Button variant="outline" onClick={() => setRemoving(null)}>Keep record</Button><Button variant="danger" onClick={() => {
          if (!removing) return;
          try { onRemove(removing); setRemoving(null); requestAnimationFrame(() => addRef.current?.focus()); }
          catch { setRemoveError('This language could not be removed. Please try again.'); }
        }}>Remove record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
