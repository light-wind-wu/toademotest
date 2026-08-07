'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/layout/shell';
import { useRole } from '@/lib/role';
import Button from '@/components/ui-legacy/button';
import {
  User, Mail, Phone, GraduationCap,
  Upload, FileText, Download, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PROFILE_KEY = 'dsta_applicant_profile';

interface ApplicantProfile {
  fullName:       string;
  email:          string;
  phone:          string;
  nationality:    string;
  institution:    string;
  course:         string;
  yearOfStudy:    string;
  graduationYear: string;
  cgpa:           string;
  documents: {
    cv?:         { name: string; uploadedAt: string };
    transcript?: { name: string; uploadedAt: string };
    other?:      { name: string; uploadedAt: string };
  };
}

function loadProfile(email: string, name: string): ApplicantProfile {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY}_${email}`);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Bootstrap from submitted application form values
  try {
    const raw = localStorage.getItem('dsta_my_applications');
    const apps: { submittedAt?: string; formValues?: Record<string, unknown> }[] = raw ? JSON.parse(raw) : [];
    const latest = apps.sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
    if (latest?.formValues) {
      const v = latest.formValues;
      const str = (k: string) => typeof v[k] === 'string' ? v[k] as string : '';
      const cvName         = str('cv_upload');
      const transcriptName = str('transcript_upload');
      return {
        fullName:       str('name') || name,
        email,
        phone:          str('contact_number') || str('phone'),
        nationality:    str('nationality') || 'Singaporean',
        institution:    str('name_of_institution'),
        course:         str('course_of_study'),
        yearOfStudy:    str('year_of_study'),
        graduationYear: str('expected_graduation_year') || str('graduation_year'),
        cgpa:           str('gpa_cap_rank_points'),
        documents: {
          ...(cvName         ? { cv:         { name: cvName,         uploadedAt: latest.submittedAt ?? new Date().toISOString() } } : {}),
          ...(transcriptName ? { transcript: { name: transcriptName, uploadedAt: latest.submittedAt ?? new Date().toISOString() } } : {}),
        },
      };
    }
  } catch {}

  return {
    fullName: name, email, phone: '', nationality: 'Singaporean',
    institution: '', course: '', yearOfStudy: '', graduationYear: '', cgpa: '',
    documents: {},
  };
}
function saveProfile(email: string, data: ApplicantProfile) {
  localStorage.setItem(`${PROFILE_KEY}_${email}`, JSON.stringify(data));
}

const NATIONALITIES = ['Singaporean', 'Singapore PR', 'Malaysian', 'Other'];
const YEARS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Graduate'];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">
        {label}{required && <span className="text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all';
const selectCls = 'w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all appearance-none';

/* ── Document slot ───────────────────────────────────────────────────────── */
function DocSlot({
  label, hint, doc, onSimulateUpload,
}: {
  label: string;
  hint: string;
  doc?: { name: string; uploadedAt: string };
  onSimulateUpload: () => void;
}) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-fg">{label}</p>
          {doc ? (
            <>
              <p className="text-body-sm text-fg-muted flex items-center gap-1 mt-0.5">
                <FileText size={12} className="text-accent shrink-0" />
                {doc.name}
              </p>
              <p className="text-[13px] text-fg-subtle mt-0.5">
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </>
          ) : (
            <p className="text-body-sm text-fg-muted mt-0.5">{hint}</p>
          )}
        </div>
        {doc ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm font-semibold text-fg hover:bg-bg-subtle transition-colors cursor-not-allowed opacity-60"
              title="Download not available in this mockup"
              disabled
            >
              <Download size={13} /> Download
            </button>
            <button
              onClick={onSimulateUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/30 text-body-sm font-semibold text-accent hover:bg-accent/5 transition-colors"
            >
              <Upload size={13} /> Update
            </button>
          </div>
        ) : (
          <button
            onClick={onSimulateUpload}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-body-sm font-semibold text-fg hover:bg-bg-subtle transition-colors"
          >
            <Upload size={13} /> Upload
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function ApplyProfile() {
  const { profile } = useRole();
  const [form,    setForm]    = useState<ApplicantProfile | null>(null);
  const [saved,   setSaved]   = useState(false);
  const [dirty,   setDirty]   = useState(false);

  useEffect(() => {
    setForm(loadProfile(profile.email, profile.name));
  }, [profile.email, profile.name]);

  if (!form) return null;

  function set<K extends keyof ApplicantProfile>(key: K, val: ApplicantProfile[K]) {
    setForm(f => f ? { ...f, [key]: val } : f);
    setDirty(true);
    setSaved(false);
  }

  function handleSave() {
    if (!form) return;
    saveProfile(profile.email, form);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 6000);
  }

  function simulateUpload(docKey: keyof ApplicantProfile['documents']) {
    if (!form) return;
    const defaultNames: Record<string, string> = {
      cv: 'CV_Resume.pdf', transcript: 'Academic_Transcript.pdf', other: 'Supporting_Document.pdf',
    };
    const existing = form.documents[docKey];
    const filename  = existing?.name ?? defaultNames[docKey] ?? 'Document.pdf';
    set('documents', { ...form.documents, [docKey]: { name: filename, uploadedAt: new Date().toISOString() } });
  }

const inp = (key: keyof ApplicantProfile) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(key, e.target.value),
  });

  return (
    <Shell activeRoute="/apply/profile">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-headline-lg text-fg">My Profile</h1>
          <p className="text-body-md text-fg-muted mt-0.5">Personal information and documents attached to your applications.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-body-sm font-semibold text-success">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          <Button disabled={!dirty} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Personal info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <User size={16} className="text-accent" />
              <h2 className="text-headline-sm font-bold text-fg">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input className={inputCls} placeholder="As per NRIC" {...inp('fullName')} />
              </Field>
              <Field label="Email">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-bg-subtle/60">
                  <Mail size={13} className="text-fg-subtle shrink-0" />
                  <span className="text-body-sm text-fg-muted">{form.email}</span>
                </div>
              </Field>
              <Field label="Mobile Number">
                <div className="flex">
                  <span className="flex items-center px-3 border border-r-0 border-border rounded-l-xl bg-bg-subtle text-body-sm text-fg-muted">
                    <Phone size={13} className="mr-1.5 text-fg-subtle" /> +65
                  </span>
                  <input className="flex-1 rounded-l-none rounded-r-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="9123 4567" {...inp('phone')} />
                </div>
              </Field>
              <Field label="Nationality" required>
                <select className={selectCls} {...inp('nationality')}>
                  {NATIONALITIES.map(n => <option key={n}>{n}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Academic info */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-5">
              <GraduationCap size={16} className="text-accent" />
              <h2 className="text-headline-sm font-bold text-fg">Academic Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Institution" required>
                <input className={inputCls} placeholder="e.g. NUS, NTU, SMU" {...inp('institution')} />
              </Field>
              <Field label="Course / Programme" required>
                <input className={inputCls} placeholder="e.g. Computer Science" {...inp('course')} />
              </Field>
              <Field label="Year of Study">
                <select className={selectCls} value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                  <option value="">Select year</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Expected Graduation Year">
                <input className={inputCls} placeholder="e.g. 2026" {...inp('graduationYear')} />
              </Field>
              <Field label="CGPA / GPA">
                <input className={inputCls} placeholder="e.g. 4.25 / 5.00" {...inp('cgpa')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-accent" />
              <h2 className="text-headline-sm font-bold text-fg">Documents</h2>
            </div>
            <p className="text-body-sm text-fg-muted mb-4">PDF or Word, max 5 MB each.</p>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-info-bg border border-info/20 mb-4">
              <AlertCircle size={14} className="text-info shrink-0 mt-0.5" />
              <p className="text-body-sm text-info">Documents uploaded here are automatically attached to all your applications.</p>
            </div>

            <DocSlot
              label="CV / Résumé" hint="Latest version"
              doc={form.documents.cv}
              onSimulateUpload={() => simulateUpload('cv')}
            />
            <DocSlot
              label="Academic Transcript" hint="Most recent official transcript"
              doc={form.documents.transcript}
              onSimulateUpload={() => simulateUpload('transcript')}
            />
            <DocSlot
              label="Supporting Document" hint="Portfolio, certificates, etc."
              doc={form.documents.other}
              onSimulateUpload={() => simulateUpload('other')}
            />
          </div>

          <div className={cn('mt-3 p-3 rounded-xl border text-body-sm flex items-center gap-2',
            Object.keys(form.documents).length === 0 ? 'bg-warning-bg border-warning/20 text-warning' : 'bg-success-bg border-success/20 text-success'
          )}>
            <CheckCircle2 size={14} className="shrink-0" />
            {Object.keys(form.documents).length === 0
              ? 'No documents uploaded yet'
              : `${Object.keys(form.documents).length} document${Object.keys(form.documents).length !== 1 ? 's' : ''} uploaded`
            }
          </div>
        </div>

      </div>
    </Shell>
  );
}
