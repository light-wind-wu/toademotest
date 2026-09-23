'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, Check, Gem, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui-legacy/select';
import { ProfileInput } from '@/components/apply/profile-fields';
import { EMPLOYMENT_MONTHS, employmentPeriod, newProfileEmployment, profileEmploymentSchema } from '@/lib/profile-employment';
import type { ProfileEmployment } from '@/lib/types';
import seed from '@/data/applicant-profile.json';

function RoleSelect({ field, label, value, options, onChange, required, error }: {
  field: string; label: string; value: string; options: readonly string[]; onChange: (value: string) => void; required?: boolean; error?: string;
}) {
  const id = `employment-${field}`;
  return <div className="min-w-0 space-y-2">
    <label id={`${id}-label`} htmlFor={id} className="block text-body-sm font-medium text-fg">{label}{required && <span className="text-danger"> *</span>}</label>
    <Select value={value || null} onValueChange={(next) => onChange(next === '__empty__' ? '' : next ?? '')}>
      <SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-required={required} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}>
        <SelectValue className="min-w-0 truncate" placeholder={`Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__empty__">Select</SelectItem>
        {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
    {error && <p id={`${id}-error`} role="alert" className="text-body-sm text-danger">{error}</p>}
  </div>;
}

function RoleEditor({ initial, adding, onClose, onApply }: {
  initial: ProfileEmployment; adding: boolean; onClose: () => void; onApply: (value: ProfileEmployment) => void;
}) {
  const [draft, setDraft] = useState<ProfileEmployment>(() => ({ ...initial, skills: [...initial.skills] }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skill, setSkill] = useState('');
  const [saveError, setSaveError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const years = Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, index) => String(new Date().getFullYear() - index));
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  const change = <K extends keyof ProfileEmployment>(key: K, value: ProfileEmployment[K]) => {
    setDraft((current) => ({ ...current, [key]: value })); setErrors({});
  };
  function addSkill(value: string) {
    const next = value.trim();
    if (!next) return;
    if (next.length > 80 || draft.skills.length >= 20) { setErrors({ skills: 'Add up to 20 skills, with no more than 80 characters each.' }); return; }
    if (draft.skills.some((item) => item.toLowerCase() === next.toLowerCase())) { setErrors({ skills: 'This skill is already added.' }); return; }
    change('skills', [...draft.skills, next]); setSkill('');
  }
  function apply() {
    if (skill.trim()) { setErrors({ skills: 'Add or clear the skill before continuing.' }); return; }
    const result = profileEmploymentSchema.safeParse(draft);
    if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]))); return; }
    try { onApply(result.data); }
    catch { setSaveError('Your changes could not be saved. Please try again.'); }
  }
  const input = (field: 'jobTitle' | 'organization' | 'location', label: string, required = false, placeholder?: string) =>
    <ProfileInput id={`employment-${field}`} label={label} value={draft[field]} required={required} placeholder={placeholder} error={errors[field]} onChange={(value) => change(field, value)} />;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
      <div className="border-b border-border px-6 py-5"><DialogTitle>{adding ? 'Add role' : 'Edit role'}</DialogTitle></div>
      <form ref={formRef} noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); apply(); }}>
        <div className="min-h-0 space-y-6 overflow-y-auto p-6">
          <section aria-labelledby="role-details">
            <h3 id="role-details" className="mb-4 text-body-md font-semibold text-fg">Role details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {input('jobTitle', 'Job title', true)}{input('organization', 'Organization')}
              {input('location', 'Location', false, 'City, region, or Remote')}
              <RoleSelect field="locationType" label="Location type" value={draft.locationType} options={seed.locationTypes} error={errors.locationType} onChange={(value) => change('locationType', value)} />
              <div className="col-span-2"><RoleSelect field="employmentType" label="Employment type" value={draft.employmentType} options={seed.employmentTypes} error={errors.employmentType} onChange={(value) => change('employmentType', value)} /></div>
            </div>
            <label className="my-5 flex items-center gap-3 text-body-sm text-fg"><Checkbox aria-label="I am currently working in this role" checked={draft.current} onCheckedChange={(checked) => change('current', !!checked)} />I am currently working in this role</label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <RoleSelect field="startMonth" label="Start month" value={draft.startMonth} options={EMPLOYMENT_MONTHS} error={errors.startMonth} onChange={(value) => change('startMonth', value)} />
              <RoleSelect field="startYear" label="Start year" required value={draft.startYear} options={years} error={errors.startYear} onChange={(value) => change('startYear', value)} />
              {!draft.current && <>
                <RoleSelect field="endMonth" label="End month" value={draft.endMonth} options={EMPLOYMENT_MONTHS} error={errors.endMonth} onChange={(value) => change('endMonth', value)} />
                <RoleSelect field="endYear" label="End year" required value={draft.endYear} options={years} error={errors.endYear} onChange={(value) => change('endYear', value)} />
              </>}
            </div>
          </section>
          <div className="space-y-2">
            <label htmlFor="employment-highlights" className="block text-body-md font-semibold text-fg">Highlights</label>
            <Textarea id="employment-highlights" value={draft.highlights} onChange={(event) => change('highlights', event.target.value)} maxLength={2000} rows={4} placeholder="Projects, problems you solved, or results you achieved" aria-invalid={!!errors.highlights} aria-describedby={errors.highlights ? 'employment-highlights-error' : undefined} />
            <p className="text-right text-body-xs text-fg-muted">{draft.highlights.length.toLocaleString()}/2,000</p>
            {errors.highlights && <p id="employment-highlights-error" role="alert" className="text-body-sm text-danger">{errors.highlights}</p>}
          </div>
          <section aria-labelledby="employment-skills-heading" className="space-y-3">
            <h3 id="employment-skills-heading" className="text-body-md font-semibold text-fg">Skills</h3>
            <p className="text-body-sm text-fg-muted">Add skills to show what you do best.</p>
            <div className="flex flex-wrap gap-2">
              {draft.skills.map((value) => <span key={value} className="inline-flex max-w-full items-center gap-2 rounded-full bg-accent px-3 py-1 text-body-sm text-accent-fg"><Check size={14} className="shrink-0" aria-hidden /><span className="break-all">{value}</span><button type="button" className="shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={`Remove skill ${value}`} title={`Remove ${value}`} onClick={() => change('skills', draft.skills.filter((item) => item !== value))}><X size={14} aria-hidden /></button></span>)}
            </div>
            <div className="flex gap-2">
              <Input id="employment-skills" aria-label="Add skill" placeholder="Add a skill" value={skill} maxLength={80} list="employment-skill-options" aria-invalid={!!errors.skills} aria-describedby={errors.skills ? 'employment-skills-error' : undefined} onChange={(event) => { setSkill(event.target.value); setErrors({}); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSkill(skill); } }} />
              <datalist id="employment-skill-options">{seed.skillSuggestions.map((option) => <option key={option} value={option} />)}</datalist>
              <Button variant="outline" size="icon" aria-label="Add skill" title="Add skill" disabled={!skill.trim()} onClick={() => addSkill(skill)}><Plus size={16} aria-hidden /></Button>
            </div>
            {errors.skills && <p id="employment-skills-error" role="alert" className="text-body-sm text-danger">{errors.skills}</p>}
          </section>
        </div>
        {saveError && <p role="alert" className="px-6 pb-4 text-body-sm text-danger">{saveError}</p>}
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function ProfileEmploymentSection({ value, onRemove, onSave }: {
  value: ProfileEmployment[]; onRemove: (id: string) => void; onSave: (value: ProfileEmployment, adding: boolean) => void;
}) {
  const [editing, setEditing] = useState<ProfileEmployment | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [expandedSkills, setExpandedSkills] = useState<string[]>([]);
  const addRef = useRef<HTMLButtonElement>(null);
  const editRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  function closeEditor() {
    const id = editing?.id; setEditing(null);
    requestAnimationFrame(() => (id && editRefs.current[id] ? editRefs.current[id] : addRef.current)?.focus());
  }
  return <section aria-labelledby="profile-employment" className="border-b border-border py-8">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 id="profile-employment" className="text-headline-sm text-fg">Employment</h2>
      <Button ref={addRef} variant="outline" size="sm" onClick={() => setEditing(newProfileEmployment())}><Plus size={16} aria-hidden />Add employment</Button>
    </div>
    {!value.length && <p className="py-3 text-body-sm text-fg-muted">No employment records.</p>}
    <div className="divide-y divide-border">
      {value.map((role, index) => <article key={role.id} className="flex items-start gap-4 py-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-bg-muted text-fg-muted"><Building2 size={24} aria-hidden /></div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-body-md font-semibold text-fg">{role.jobTitle}</h3>
          {(role.organization || role.employmentType) && <p className="mt-1 break-words text-body-sm text-fg">{[role.organization, role.employmentType].filter(Boolean).join(' · ')}</p>}
          <p className="mt-1 text-body-sm text-fg-muted">{employmentPeriod(role)}</p>
          {(role.location || role.locationType) && <p className="mt-1 break-words text-body-sm text-fg-muted">{[role.location, role.locationType].filter(Boolean).join(' · ')}</p>}
          {role.highlights && <p className="mt-3 whitespace-pre-line break-words text-body-sm text-fg">{role.highlights}</p>}
          {!!role.skills.length && <div className="mt-3 flex items-start gap-2 text-body-sm font-medium text-fg"><Gem size={16} className="mt-0.5 shrink-0" aria-hidden /><p className="min-w-0 break-words">{(expandedSkills.includes(role.id) ? role.skills : role.skills.slice(0, 2)).join(', ')}{role.skills.length > 2 && <button type="button" className="ml-1 text-accent hover:underline" onClick={() => setExpandedSkills((ids) => ids.includes(role.id) ? ids.filter((id) => id !== role.id) : [...ids, role.id])}>{expandedSkills.includes(role.id) ? 'Show less' : `and +${role.skills.length - 2} skills`}</button>}</p></div>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button ref={(element) => { editRefs.current[role.id] = element; }} variant="ghost" size="icon" aria-label={`Edit employment ${index + 1}`} title="Edit employment" onClick={() => setEditing(role)}><Pencil size={16} aria-hidden /></Button>
          <Button variant="ghost" size="icon" className="text-danger" aria-label={`Remove employment ${index + 1}`} title="Remove employment" onClick={() => { setRemoveError(''); setRemoveId(role.id); }}><Trash2 size={16} aria-hidden /></Button>
        </div>
      </article>)}
    </div>
    {editing && <RoleEditor key={editing.id} initial={editing} adding={!value.some((role) => role.id === editing.id)} onClose={closeEditor} onApply={(next) => {
      onSave(next, !value.some((role) => role.id === next.id)); closeEditor();
    }} />}
    <Dialog open={!!removeId} onOpenChange={(open) => { if (!open) setRemoveId(null); }}>
      <DialogContent><DialogTitle>Remove this employment?</DialogTitle><DialogDescription>This record will be removed from your profile.</DialogDescription>
        {removeError && <p role="alert" className="text-body-sm text-danger">{removeError}</p>}
        <DialogFooter><Button variant="outline" onClick={() => setRemoveId(null)}>Keep record</Button><Button variant="danger" onClick={() => {
          if (!removeId) return;
          try { onRemove(removeId); setRemoveId(null); requestAnimationFrame(() => addRef.current?.focus()); }
          catch { setRemoveError('This record could not be removed. Please try again.'); }
        }}>Remove record</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
