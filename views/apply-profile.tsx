'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ProfileTestDialog from '@/components/apply/profile-test-dialog';
import ProfileEducationDialog from '@/components/apply/profile-education-dialog';
import ProfileLanguages from '@/components/apply/profile-languages';
import ProfileEmploymentSection from '@/components/apply/profile-employment';
import ProfilePersonalEditor from '@/components/apply/profile-personal-editor';
import ProfileDocuments from '@/components/apply/profile-documents';
import ProfilePhotoEditor from '@/components/apply/profile-photo-editor';
import ProfileEmailChange from '@/components/apply/profile-email-change';
import {
  loadEditableApplicantProfile,
  newProfileEducation, newProfileTest, hasProfileProgramme,
  saveProfilePersonal, saveProfileEmployment, saveProfileEducation, saveProfileTestScore,
  saveProfileLanguage, removeProfileLanguage, removeProfileRecord,
} from '@/lib/applicant-profile';
import type { ApplicantEditableProfile, ProfileEducation, ProfileTestScore } from '@/lib/types';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ApplyProfile() {
  const { profile, roleReady } = useRole();
  const emailButtonRef = useRef<HTMLButtonElement>(null);
  const personalButtonRef = useRef<HTMLButtonElement>(null);
  const addEducationRef = useRef<HTMLButtonElement>(null);
  const educationEditRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const addTestRef = useRef<HTMLButtonElement>(null);
  const testEditRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [editingTest, setEditingTest] = useState<ProfileTestScore | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [form, setForm] = useState<ApplicantEditableProfile | null>(null);
  const [editingEducation, setEditingEducation] = useState<ProfileEducation | null>(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [removeSection, setRemoveSection] = useState<'education' | 'testScores'>('education');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [refreshPending, setRefreshPending] = useState(false);

  useEffect(() => {
    if (!roleReady) return;
    try {
      const next = loadEditableApplicantProfile(profile.email, profile.name);
      setForm(next); setLoadError(''); setEditingEducation(null);
      setEditingPersonal(false);
      setEditingTest(null);
      setEmailOpen(false); setEmailNotice('');
    } catch {
      setForm(null);
      setLoadError('Your saved profile could not be loaded. Your existing data has not been changed.');
    }
  }, [profile.email, profile.name, roleReady]);

  useEffect(() => {
    if (refreshPending) window.location.reload();
  }, [refreshPending]);
  function closeTest() {
    const id = editingTest?.id;
    setEditingTest(null);
    requestAnimationFrame(() => (id && testEditRefs.current[id] ? testEditRefs.current[id] : addTestRef.current)?.focus());
  }

  function closeEmail() {
    setEmailOpen(false);
    requestAnimationFrame(() => emailButtonRef.current?.focus());
  }
  function closePersonal() {
    setEditingPersonal(false);
    requestAnimationFrame(() => personalButtonRef.current?.focus());
  }
  function closeEducation() {
    const id = editingEducation?.id;
    setEditingEducation(null);
    requestAnimationFrame(() => (id && educationEditRefs.current[id] ? educationEditRefs.current[id] : addEducationRef.current)?.focus());
  }
  const changeEmailButton = <Button ref={emailButtonRef} variant="link" size="sm" className="h-auto shrink-0 p-0 text-sm" onClick={() => { setEmailNotice(''); setEmailOpen(true); }}>Change email</Button>;

  return (
    <Shell activeRoute="/apply/profile">
      <div className="mx-auto max-w-7xl pb-6 pt-6">
        <h1 className="text-headline-lg text-fg">My Profile</h1>
        {loadError && <p role="alert" className="mt-6 text-body-md text-danger">{loadError}</p>}
        {form && <div className="grid gap-x-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="profile-personal" className="order-1 mt-8 min-w-0 border-b border-border pb-8 lg:col-start-1">
            <div className="mb-6 flex items-center gap-4">
              <ProfilePhotoEditor key={form.email} profile={form} initials={profile.initials} onSaved={setForm} />
              <div className="min-w-0"><h2 id="profile-personal" className="text-headline-sm text-fg">Personal information</h2></div>
              <Button ref={personalButtonRef} variant="ghost" size="icon" className="ml-auto shrink-0" aria-label="Edit personal information" title="Edit personal information" aria-haspopup="dialog" onClick={() => setEditingPersonal(true)}><Pencil size={16} /></Button>
            </div>
            <dl id="profile-personal-fields" className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {[
                ['Name', form.fullName],
                ['NRIC / FIN', form.nric],
                ['Nationality', form.nationality],
                ['Country of birth', form.countryOfBirth],
                ['Date of birth', form.dateOfBirth && isValid(parseISO(form.dateOfBirth)) ? format(parseISO(form.dateOfBirth), 'dd MMM yyyy') : form.dateOfBirth],
                ['Sex', form.sex],
                ['Mobile number', form.phone],
                ['Email', form.email],
                ['Residential status', form.residentialStatus],
                ['Registered address', form.registeredAddress],
              ].map(([label, value]) => <div key={label} className={cn('min-w-0', label === 'Registered address' && 'sm:col-span-2')}>
                <dt className="flex items-center justify-between gap-3 text-body-sm text-fg-muted"><span>{label}</span>{label === 'Email' && changeEmailButton}</dt>
                <dd className="mt-2 break-words text-body-sm text-fg">{value || 'Not provided'}</dd>
                {label === 'Email' && emailNotice && <dd role="status" className="mt-2 text-body-sm text-success">{emailNotice}</dd>}
              </div>)}
            </dl>
          </section>

          <aside className="order-2 mt-8 min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <ProfileDocuments key={form.email} profile={form} dirty={false} onSaved={(next, refresh) => {
              setForm(next);
              if (refresh) setRefreshPending(true);
            }} />
          </aside>
          <div className="order-3 min-w-0 lg:col-start-1">
          <section aria-labelledby="profile-education" className="border-b border-border py-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="profile-education" className="text-headline-sm text-fg">Education <span className="ml-2 text-body-sm font-normal text-fg-muted">{form.education.length}</span></h2>
              <Button ref={addEducationRef} variant="outline" size="sm" aria-haspopup="dialog" onClick={() => setEditingEducation(newProfileEducation())}><Plus size={16} aria-hidden />Add education</Button>
            </div>
            {!form.education.length && <p className="py-3 text-body-sm text-fg-muted">No education records.</p>}
            <div className="space-y-4">
              {form.education.map((education, index) => {
                const displayMonth = (value: string) => value && isValid(parseISO(value)) ? format(parseISO(value), 'MMM yyyy') : '';
                const start = displayMonth(education.startDate);
                const end = displayMonth(education.status === 'Currently studying' ? education.expectedGraduation : education.endDate) || education.legacyGraduationYear;
                const dates = start && end ? `${start} – ${end}` : start ? `From ${start}` : end ? `${education.status === 'Currently studying' ? 'Expected ' : ''}${end}` : '';
                return (
                  <div key={education.id} className="rounded-lg border border-border bg-surface" data-education-id={education.id}>
                    <div className="flex items-start justify-between gap-3 p-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-body-md font-semibold text-fg">{education.institution || 'New education record'}</h3><Badge variant="subtle">{education.status}</Badge></div>
                        <p className="mt-2 break-words text-body-sm text-fg">{education.qualification}{hasProfileProgramme(education.qualification) && education.course ? ` · ${education.course}` : ''}</p>
                        {dates && <p className="mt-1 text-body-sm text-fg-muted">{dates}</p>}
                        {education.status === 'Currently studying' && education.currentYear && <p className="mt-1 text-body-sm text-fg-muted">{education.currentYear}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button ref={(element) => { educationEditRefs.current[education.id] = element; }} variant="ghost" size="icon" aria-label={`Edit education ${index + 1}`} title="Edit education" aria-haspopup="dialog"
                          onClick={() => setEditingEducation(education)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Remove education ${index + 1}`} title="Remove education" className="text-danger" onClick={() => { setRemoveSection('education'); setRemoveError(''); setRemoveId(education.id); }}><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <ProfileEmploymentSection value={form.employment} onRemove={(id) => setForm(removeProfileRecord(profile.email, profile.name, 'employment', id))}
            onSave={(value, adding) => setForm(saveProfileEmployment(profile.email, profile.name, value, adding))} />
          <section aria-labelledby="profile-tests" className="border-b border-border py-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="profile-tests" className="text-headline-sm text-fg">Additional Test Scores</h2>
              <Button ref={addTestRef} variant="outline" size="sm" aria-haspopup="dialog" onClick={() => setEditingTest(newProfileTest())}><Plus size={16} aria-hidden />Add test score</Button>
            </div>
            {!form.testScores.length && <p className="py-3 text-body-sm text-fg-muted">No additional test scores.</p>}
            <div className="space-y-4">
              {form.testScores.map((test, index) => <div key={test.id} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-body-md font-semibold text-fg">{test.exam}</h3>
                    <p className="mt-2 text-body-sm text-fg-muted">Test date: {test.testDate && isValid(parseISO(test.testDate)) ? format(parseISO(test.testDate), 'dd MMM yyyy') : 'Not provided'}</p>
                    <p className="mt-1 break-words text-body-sm text-fg">Total score: {test.score || 'Not provided'}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button ref={(element) => { testEditRefs.current[test.id] = element; }} variant="ghost" size="icon" aria-label={`Edit test ${index + 1}`} title="Edit test score" aria-haspopup="dialog" onClick={() => setEditingTest(test)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Remove test ${index + 1}`} title="Remove test score" className="text-danger" onClick={() => { setRemoveSection('testScores'); setRemoveError(''); setRemoveId(test.id); }}><Trash2 size={16} /></Button>
                  </div>
                </div>
              </div>)}
            </div>
          </section>

          <ProfileLanguages value={form.languages}
            onSave={(value, previous) => setForm(saveProfileLanguage(profile.email, profile.name, value, previous))}
            onRemove={(value) => setForm(removeProfileLanguage(profile.email, profile.name, value))} />
          </div>
        </div>}
      </div>

      {editingTest && form && <ProfileTestDialog key={editingTest.id} initial={editingTest} adding={!form.testScores.some((item) => item.id === editingTest.id)} onClose={closeTest} onSave={(value) => {
        setForm(saveProfileTestScore(profile.email, profile.name, value, !form.testScores.some((item) => item.id === value.id)));
        closeTest();
      }} />}

      {editingEducation && form && <ProfileEducationDialog key={editingEducation.id} initial={editingEducation} adding={!form.education.some((item) => item.id === editingEducation.id)} onClose={closeEducation} onSave={(value) => {
        setForm(saveProfileEducation(profile.email, profile.name, value, !form.education.some((item) => item.id === value.id)));
        closeEducation();
      }} />}

      {editingPersonal && form && <ProfilePersonalEditor initial={form} onClose={closePersonal} onSave={(value) => {
        setForm(saveProfilePersonal(profile.email, profile.name, value)); closePersonal();
      }} />}

      {emailOpen && form && <ProfileEmailChange profile={form} onClose={closeEmail} onSaved={(next) => {
        setForm(next);
        setEmailNotice('Email updated'); closeEmail();
      }} />}

      <Dialog open={!!removeId} onOpenChange={(open) => { if (!open) setRemoveId(null); }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)]">
          <DialogTitle>Remove this record?</DialogTitle><DialogDescription>This record will be removed from your profile.</DialogDescription>
          {removeError && <p role="alert" className="text-body-sm text-danger">{removeError}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setRemoveId(null)}>Keep record</Button><Button variant="danger" onClick={() => {
            if (!removeId) return;
            try {
              setForm(removeProfileRecord(profile.email, profile.name, removeSection, removeId));
              setRemoveId(null);
              requestAnimationFrame(() => (removeSection === 'education' ? addEducationRef.current : addTestRef.current)?.focus());
            } catch { setRemoveError('This record could not be removed. Please try again.'); }
          }}>Remove record</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
