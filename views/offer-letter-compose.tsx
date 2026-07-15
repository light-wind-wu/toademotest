'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  ChevronLeft, Mail, User, Briefcase, Award, Clock,
  MapPin, Info, FileText, CalendarDays, Bell,
} from 'lucide-react';
import DatePicker from '@/components/ui-legacy/date-picker';
import Modal from '@/components/ui-legacy/modal';
import type { Application, ProjectEntry, OfferLetterTemplate } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import { addNotification } from '@/lib/notifications';
import { loadSystemConfig } from '@/lib/portal-config';
import seedApps from '@/data/applications.json';
import offerLetterSeed from '@/data/offer-letter-templates.json';

/* ── localStorage helpers ────────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const s   = localStorage.getItem(APP_KEY);
    if (!s || ver !== APP_SEED_VER) return seedApps as Application[];
    return JSON.parse(s) as Application[];
  } catch { return seedApps as Application[]; }
}
function saveApps(apps: Application[]) {
  localStorage.setItem(APP_KEY, JSON.stringify(apps));
  localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
}

const OL_KEY      = 'dsta_offer_letters';
const OL_VER_KEY  = 'dsta_offer_letters_seed_v';
const OL_SEED_VER = '4';

function loadOfferLetters(): OfferLetterTemplate[] {
  try {
    const ver = localStorage.getItem(OL_VER_KEY);
    if (ver !== OL_SEED_VER) {
      const fresh = offerLetterSeed as OfferLetterTemplate[];
      localStorage.setItem(OL_KEY, JSON.stringify(fresh));
      localStorage.setItem(OL_VER_KEY, OL_SEED_VER);
      return fresh;
    }
    const raw = localStorage.getItem(OL_KEY);
    return raw ? JSON.parse(raw) : (offerLetterSeed as OfferLetterTemplate[]);
  } catch {
    return offerLetterSeed as OfferLetterTemplate[];
  }
}

/* ── Draft helpers ───────────────────────────────────────────────────── */
const DRAFT_KEY = 'dsta_offer_drafts';

interface OfferDraft { body: string; deadline: string; reminderOn: boolean; reminderDays: number; startDate?: string; endDate?: string; }

function loadDraft(appId: string): OfferDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Record<string, OfferDraft>)[appId] ?? null;
  } catch { return null; }
}
function saveDraftToStorage(appId: string, data: OfferDraft) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...all, [appId]: data }));
  } catch {}
}
function clearDraftFromStorage(appId: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, OfferDraft>;
    delete all[appId];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {}
}

/* ── Deadline helpers ────────────────────────────────────────────────── */
function addWorkingDays(date: Date, days: number): Date {
  let count = 0;
  const d = new Date(date);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return d;
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function substituteVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, 'g'), v),
    text
  );
}

function fmtLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });
}
/* Formatted date for letter substitution — distinct placeholder when unset so a
   later edit in the left panel can find-and-replace it without ambiguity. */
function startDateVar(iso: string): string { return iso ? fmtLong(iso) : '[internship start date]'; }
function endDateVar(iso: string):   string { return iso ? fmtLong(iso) : '[internship end date]'; }
function periodVar(start: string, end: string): string {
  return start && end ? `${fmtLong(start)} to ${fmtLong(end)}` : '[internship period]';
}

function buildVars(app: Application, project: ProjectEntry | null, startDate: string, endDate: string): Record<string, string> {
  const stipend = app.year <= 2
    ? '$1,200 per month'
    : app.year === 3
      ? '$1,500 per month'
      : '$1,800 per month';
  const offerDate = new Date().toLocaleDateString('en-SG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return {
    applicant_name:        app.name,
    project_title:         project?.title              ?? app.shortlistedFor ?? '',
    mentor_name:           project?.mentor             ?? '',
    programme_name:        app.programmeName,
    internship_duration:   project?.internshipDuration ?? '',
    working_location:      project?.workingLocation    ?? '',
    portal_link:           'https://talent.dsta.gov.sg',
    monthly_stipend:       stipend,
    offer_date:            offerDate,
    internship_start_date: startDateVar(startDate),
    internship_end_date:   endDateVar(endDate),
    internship_period:     periodVar(startDate, endDate),
  };
}

/* ── Page component ──────────────────────────────────────────────────── */
export default function OfferLetterCompose() {
  const params  = useSearchParams();
  const router  = useRouter();
  const appId   = params.get('appId') ?? '';
  const { toast, showToast } = useToast();

  const [app,          setApp]          = useState<Application | null>(null);
  const [project,      setProject]      = useState<ProjectEntry | null>(null);
  const [allTemplates, setAllTemplates] = useState<OfferLetterTemplate[]>([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [body,         setBody]         = useState('');
  const [loaded,       setLoaded]       = useState(false);
  const [deadline,     setDeadline]     = useState('');
  const [reminderOn,   setReminderOn]   = useState(true);
  const [reminderDays, setReminderDays] = useState(3);
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [confirmSend,  setConfirmSend]  = useState(false);

  useEffect(() => {
    const apps      = loadApps();
    const projects  = loadProjects();
    const found     = apps.find(a => a.id === appId) ?? null;
    const proj      = found?.shortlistedFor
      ? (projects.find(p => p.id === found.shortlistedFor) ?? null)
      : null;

    setApp(found);
    setProject(proj);

    const templates = loadOfferLetters();
    setAllTemplates(templates);

    // Offer validity (Accept-by) default comes from Admin → System config (offerValidityDays).
    const defaultDeadline = toDateInput(addWorkingDays(new Date(), loadSystemConfig().offerValidityDays));

    // IO-set internship dates default to the applicant's preferred dates (if any)
    const draft0     = loadDraft(appId);
    const defStart   = draft0?.startDate ?? found?.internshipStartDate ?? (found?.formValues?.preferred_start_date as string) ?? '';
    const defEnd     = draft0?.endDate   ?? found?.internshipEndDate   ?? (found?.formValues?.preferred_end_date   as string) ?? '';
    setStartDate(defStart);
    setEndDate(defEnd);

    if (found && templates.length > 0) {
      const vars  = buildVars(found, proj, defStart, defEnd);
      const first = templates[0];
      setSelectedId(first.id);
      const templateBody = substituteVars(first.body, vars);

      if (draft0) {
        setBody(draft0.body);
        setDeadline(draft0.deadline || defaultDeadline);
        setReminderOn(draft0.reminderOn);
        setReminderDays(draft0.reminderDays);
      } else {
        setBody(templateBody);
        setDeadline(defaultDeadline);
      }
    } else {
      setDeadline(defaultDeadline);
    }
    setLoaded(true);
  }, [appId]);

  function onSelectTemplate(id: string) {
    if (!app) return;
    const tmpl = allTemplates.find(t => t.id === id);
    if (!tmpl) return;
    setSelectedId(id);
    const b = substituteVars(tmpl.body, buildVars(app, project, startDate, endDate));
    setBody(b);
  }

  /* Update an internship date and keep the already-substituted letter in sync by
     find-and-replacing the old formatted date — preserves manual edits elsewhere. */
  function changeStartDate(v: string) {
    setBody(b => b.split(startDateVar(startDate)).join(startDateVar(v))
                  .split(periodVar(startDate, endDate)).join(periodVar(v, endDate)));
    setStartDate(v);
  }
  function changeEndDate(v: string) {
    setBody(b => b.split(endDateVar(endDate)).join(endDateVar(v))
                  .split(periodVar(startDate, endDate)).join(periodVar(startDate, v)));
    setEndDate(v);
  }

  function saveDraft() {
    if (!app) return;
    saveDraftToStorage(appId, { body, deadline, reminderOn, reminderDays, startDate, endDate });
    showToast('Draft saved');
  }

  function doSend() {
    if (!app) return;
    clearDraftFromStorage(appId);
    const apps    = loadApps();
    const updated = apps.map(a =>
      a.id === app.id ? {
        ...a,
        status:              'Offer Extended' as const,
        offerDeadline:       deadline || undefined,
        offerReminderDays:   reminderOn ? reminderDays : 0,
        offerLetterBody:     body || undefined,
        internshipStartDate: startDate || undefined,
        internshipEndDate:   endDate || undefined,
      } : a
    );
    saveApps(updated);
    addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Internship offer extended', body: `DSTA has extended you an offer for ${app.programmeName}. Please review and respond.`, href: '/apply/applications', tier: 'action' });
    showToast(`Offer sent to ${app.name}`);
    setTimeout(() => router.push('/applications'), 1200);
  }

  if (!loaded) return null;

  if (!app) {
    return (
      <Shell activeRoute="/applications">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-body-md text-fg-muted">Application not found.</p>
          <Button variant="ghost" onClick={() => router.push('/applications')}>
            <ChevronLeft size={14} /> Back to Applications
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell activeRoute="/applications">
      <Toast message={toast} />

      {/* Sticky action bar */}
      <div className="sticky top-[64px] z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-bg border-b border-border flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-body-sm">
          <button
            onClick={() => router.push('/applications')}
            className="flex items-center gap-1 text-fg-muted hover:text-fg transition-colors"
          >
            <ChevronLeft size={15} /> Applications
          </button>
          <span className="text-fg-subtle">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Mail size={12} className="text-accent" />
            </div>
            <div>
              <span className="text-fg font-semibold">Extend Offer</span>
              <span className="text-fg-muted ml-2">→ {app.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => setConfirmSend(true)} disabled={allTemplates.length === 0}>
            <Mail size={14} /> Send Offer
          </Button>
          <Button variant="outline" onClick={saveDraft} disabled={allTemplates.length === 0}>Save Draft</Button>
          <Button variant="ghost" onClick={() => router.push('/applications')}>Cancel</Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

        {/* Left: details sidebar */}
        <div className="space-y-4">

          {/* Applicant */}
          <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-body-md font-bold text-fg">{app.name}</p>
              <p className="text-body-sm text-fg-muted">{app.school} · Year {app.year}</p>
            </div>
          </div>

          {/* Preferred dates — highlighted for IO reference when setting start date */}
          {(app.formValues?.preferred_start_date || app.formValues?.preferred_end_date) && (
            <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarDays size={13} className="text-accent shrink-0" />
                <p className="text-[12px] font-semibold text-accent">Applicant's Preferred Dates</p>
              </div>
              <div className="flex items-center gap-2 text-body-sm text-fg font-medium">
                <span>{app.formValues.preferred_start_date
                  ? new Date(app.formValues.preferred_start_date as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}</span>
                <span className="text-fg-muted">→</span>
                <span>{app.formValues.preferred_end_date
                  ? new Date(app.formValues.preferred_end_date as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}</span>
              </div>
            </div>
          )}

          {/* Offer details */}
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-start gap-3 px-4 py-3">
              <Briefcase size={13} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Project</p>
                <p className="text-body-sm font-semibold text-fg">{project?.title ?? app.shortlistedFor}</p>
                {project?.mentor && (
                  <p className="text-[13px] text-fg-muted mt-0.5">{project.mentor}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <Award size={13} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Programme</p>
                <p className="text-body-sm font-semibold text-fg">{app.programmeName}</p>
              </div>
            </div>
            {project?.internshipDuration && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Clock size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Project Duration</p>
                  <p className="text-body-sm font-semibold text-fg">{project.internshipDuration}</p>
                </div>
              </div>
            )}
            {project?.workingLocation && (
              <div className="flex items-start gap-3 px-4 py-3">
                <MapPin size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Location</p>
                  <p className="text-body-sm font-semibold text-fg">{project.workingLocation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Internship Period — IO sets the start & end dates; flow into the letter */}
          <div className="border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-subtle/50 border-b border-border">
              <CalendarDays size={12} className="text-fg-muted" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Internship Period</p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-fg-muted mb-1">Start Date</label>
                <DatePicker value={startDate} onChange={changeStartDate} placeholder="Select start date" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-fg-muted mb-1">End Date</label>
                <DatePicker value={endDate} onChange={changeEndDate} placeholder="Select end date" />
              </div>
              <p className="text-[13px] text-fg-muted">These dates appear in the offer letter and are saved to the intern's record.</p>
            </div>
          </div>

          {/* Response Deadline */}
          <div className="border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-subtle/50 border-b border-border">
              <CalendarDays size={12} className="text-fg-muted" />
              <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Response Deadline</p>
            </div>
            <div className="px-4 py-3">
              <DatePicker value={deadline} onChange={setDeadline} placeholder="Select deadline" />
              <p className="text-[13px] text-fg-muted mt-1.5">Applicant must respond by this date.</p>
            </div>
          </div>

          {/* Reminder */}
          <div className="border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-center justify-between px-4 py-2.5 bg-bg-subtle/50 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={12} className="text-fg-muted" />
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle">Reminder</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderOn}
                  onChange={e => setReminderOn(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                />
                <span className="text-[13px] text-fg-muted">{reminderOn ? 'On' : 'Off'}</span>
              </label>
            </div>
            {reminderOn && (
              <div className="px-4 py-3 flex items-center gap-2">
                <p className="text-body-sm text-fg-muted shrink-0">Remind</p>
                <select
                  value={reminderDays}
                  onChange={e => setReminderDays(Number(e.target.value))}
                  className="text-body-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-fg outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                </select>
                <p className="text-body-sm text-fg-muted shrink-0">before deadline</p>
              </div>
            )}
          </div>

        </div>

        {/* Right: letter editor */}
        <div className="bg-surface rounded-xl border border-border flex flex-col">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
            <FileText size={14} className="text-fg-muted shrink-0" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle shrink-0">Offer Letter</p>
            {allTemplates.length > 0 && (
              <select
                value={selectedId}
                onChange={e => onSelectTemplate(e.target.value)}
                className="flex-1 text-body-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-fg outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
              >
                {allTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Body */}
          {allTemplates.length === 0 ? (
            <div className="flex items-start gap-2 m-5 px-3 py-3 bg-warning-bg border border-warning/20 rounded-xl">
              <Info size={13} className="text-warning mt-0.5 shrink-0" />
              <p className="text-[13px] text-fg-muted leading-relaxed">
                No offer letter templates found. Create one in{' '}
                <span className="font-semibold text-accent">Templates → Offer Letters</span>.
              </p>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full px-5 py-4 text-body-sm text-fg bg-transparent resize-none outline-none leading-relaxed font-mono"
              style={{ minHeight: '75vh' }}
            />
          )}

        </div>
      </div>

      {/* Send confirmation modal */}
      <Modal open={confirmSend} onClose={() => setConfirmSend(false)} labelledBy="send-offer-title">
        <h2 id="send-offer-title" className="text-headline-sm font-bold text-fg mb-1">Send offer to {app.name}?</h2>
        <p className="text-body-sm text-fg-muted mb-1">
          This will extend an internship offer via the DSTA Talent Portal.
        </p>
        {(startDate || endDate) && (
          <p className="text-body-sm text-fg-muted mb-1">
            Internship period: <span className="font-semibold text-fg">{startDate ? fmtLong(startDate) : '—'} → {endDate ? fmtLong(endDate) : '—'}</span>
          </p>
        )}
        {deadline && (
          <p className="text-body-sm text-fg-muted mb-5">
            Response deadline: <span className="font-semibold text-fg">{new Date(deadline).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { setConfirmSend(false); doSend(); }}>
            <Mail size={14} /> Confirm Send
          </Button>
          <Button variant="ghost" onClick={() => setConfirmSend(false)}>Cancel</Button>
        </div>
      </Modal>
    </Shell>
  );
}
