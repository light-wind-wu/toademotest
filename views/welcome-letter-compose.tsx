'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  ChevronLeft, Mail, User, Briefcase, Award, Clock,
  MapPin, FileText, Info,
} from 'lucide-react';
import type { Application, ProjectEntry, WelcomeLetterTemplate } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import seedApps from '@/data/applications.json';
import { addNotification } from '@/lib/notifications';
import welcomeLetterSeed from '@/data/welcome-letter-templates.json';

/* ── Storage ─────────────────────────────────────────────────────────────── */
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

const WL_KEY      = 'dsta_welcome_letters';
const WL_VER_KEY  = 'dsta_welcome_letters_seed_v';
const WL_SEED_VER = '1';

function loadTemplates(): WelcomeLetterTemplate[] {
  try {
    const ver = localStorage.getItem(WL_VER_KEY);
    if (ver !== WL_SEED_VER) {
      const fresh = welcomeLetterSeed as WelcomeLetterTemplate[];
      localStorage.setItem(WL_KEY, JSON.stringify(fresh));
      localStorage.setItem(WL_VER_KEY, WL_SEED_VER);
      return fresh;
    }
    const raw = localStorage.getItem(WL_KEY);
    return raw ? JSON.parse(raw) : (welcomeLetterSeed as WelcomeLetterTemplate[]);
  } catch {
    return welcomeLetterSeed as WelcomeLetterTemplate[];
  }
}

/* ── Draft helpers ────────────────────────────────────────────────────────── */
const DRAFT_KEY = 'dsta_welcome_drafts';

function loadDraft(appId: string): string | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as Record<string, string>)[appId] ?? null;
  } catch { return null; }
}

function saveDraftToStorage(appId: string, body: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...all, [appId]: body }));
  } catch {}
}

function clearDraftFromStorage(appId: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, string>;
    delete all[appId];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {}
}

/* ── Variable substitution ───────────────────────────────────────────────── */
function substituteVars(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replace(new RegExp(`{{${k}}}`, 'g'), v),
    text
  );
}

function buildVars(app: Application, project: ProjectEntry | null): Record<string, string> {
  const fmt = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }) : '[TBD]';
  return {
    first_name:      app.name.split(' ')[0],
    applicant_name:  app.name,
    school:          app.school,
    start_date:      fmt(app.internshipStartDate),
    end_date:        fmt(app.internshipEndDate),
    programme_name:  app.programmeName,
    project_title:   project?.title ?? app.shortlistedFor ?? '',
    supervisor_name: project?.mentor ?? '',
  };
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function WelcomeLetterCompose() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const appId        = searchParams.get('appId') ?? '';
  const { toast, showToast } = useToast();

  const [app,          setApp]          = useState<Application | null>(null);
  const [project,      setProject]      = useState<ProjectEntry | null>(null);
  const [allTemplates, setAllTemplates] = useState<WelcomeLetterTemplate[]>([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [body,         setBody]         = useState('');
  const [loaded,       setLoaded]       = useState(false);
  const [confirmSend,  setConfirmSend]  = useState(false);

  useEffect(() => {
    const apps     = loadApps();
    const projects = loadProjects();
    const found    = apps.find(a => a.id === appId) ?? null;
    const proj     = found?.shortlistedFor
      ? (projects.find(p => p.id === found.shortlistedFor) ?? null)
      : null;

    setApp(found);
    setProject(proj);

    const templates = loadTemplates();
    setAllTemplates(templates);

    if (found && templates.length > 0) {
      const vars  = buildVars(found, proj);
      const first = found.creditBearing
        ? (templates.find(t => t.id === 'WL-002') ?? templates[0])
        : templates[0];
      setSelectedId(first.id);

      const draft = loadDraft(appId);
      setBody(draft ?? substituteVars(first.body, vars));
    }

    setLoaded(true);
  }, [appId]);

  function onSelectTemplate(id: string) {
    if (!app) return;
    const tmpl = allTemplates.find(t => t.id === id);
    if (!tmpl) return;
    setSelectedId(id);
    setBody(substituteVars(tmpl.body, buildVars(app, project)));
  }

  function saveDraft() {
    if (!app) return;
    saveDraftToStorage(appId, body);
    showToast('Draft saved');
  }

  function doSend() {
    if (!app) return;
    clearDraftFromStorage(appId);
    const today   = new Date().toISOString().split('T')[0];
    const apps    = loadApps();
    const updated = apps.map(a =>
      a.id === app.id ? { ...a, welcomeLetterSent: true, welcomeLetterSentDate: today, welcomeLetterBody: body } : a
    );
    saveApps(updated);
    addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Welcome letter received', body: `Your welcome letter for ${app.programmeName} is now available in your internship portal.`, href: '/apply/internship', tier: 'info' });
    showToast(`Welcome letter sent to ${app.name}`);
    setTimeout(() => router.push('/interns'), 1200);
  }

  if (!loaded) return null;

  if (!app) {
    return (
      <Shell activeRoute="/interns">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-body-md text-fg-muted">Application not found.</p>
          <Button variant="ghost" onClick={() => router.push('/interns')}>
            <ChevronLeft size={14} /> Back to Interns
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell activeRoute="/interns">
      <Toast message={toast} />

      {/* Sticky action bar */}
      <div className="sticky top-[64px] z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-bg border-b border-border flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-body-sm">
          <button
            onClick={() => router.push('/interns')}
            className="flex items-center gap-1 text-fg-muted hover:text-fg transition-colors"
          >
            <ChevronLeft size={15} /> Interns
          </button>
          <span className="text-fg-subtle">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Mail size={12} className="text-accent" />
            </div>
            <div>
              <span className="text-fg font-semibold">Send Welcome Letter</span>
              <span className="text-fg-muted ml-2">→ {app.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button onClick={() => setConfirmSend(true)} disabled={allTemplates.length === 0}>
            <Mail size={14} /> Send Welcome Letter
          </Button>
          <Button variant="outline" onClick={saveDraft} disabled={allTemplates.length === 0}>Save Draft</Button>
          <Button variant="ghost" onClick={() => router.push('/interns')}>Cancel</Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">

        {/* Left: details sidebar */}
        <div className="space-y-4">

          {/* Recipient */}
          <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-body-md font-bold text-fg">{app.name}</p>
              <p className="text-body-sm text-fg-muted">{app.email}</p>
              <p className="text-body-sm text-fg-muted">{app.school}</p>
            </div>
          </div>

          {/* Internship details */}
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-start gap-3 px-4 py-3">
              <Award size={13} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Programme</p>
                <p className="text-body-sm font-semibold text-fg">{app.programmeName}</p>
              </div>
            </div>
            {project && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Briefcase size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Project</p>
                  <p className="text-body-sm font-semibold text-fg">{project.title}</p>
                  {project.mentor && (
                    <p className="text-[13px] text-fg-muted mt-0.5">{project.mentor}</p>
                  )}
                </div>
              </div>
            )}
            {(app.internshipStartDate || app.internshipEndDate) && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Clock size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Internship Period</p>
                  {app.internshipStartDate && (
                    <p className="text-body-sm text-fg">
                      {new Date(app.internshipStartDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {app.internshipEndDate && (
                        <> — {new Date(app.internshipEndDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </p>
                  )}
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
            {app.creditBearing !== undefined && (
              <div className="flex items-start gap-3 px-4 py-3">
                <FileText size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Type</p>
                  <p className="text-body-sm font-semibold text-fg">
                    {app.creditBearing ? 'Credit-Bearing' : 'Non Credit-Bearing'}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right: letter editor */}
        <div className="bg-surface rounded-xl border border-border flex flex-col">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
            <Mail size={14} className="text-fg-muted shrink-0" />
            <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle shrink-0">Welcome Letter</p>
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
                No welcome letter templates found. Create one in{' '}
                <span className="font-semibold text-accent">Templates → Welcome Letters</span>.
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
      <Modal open={confirmSend} onClose={() => setConfirmSend(false)} labelledBy="send-welcome-letter-title">
        <h2 id="send-welcome-letter-title" className="text-headline-sm font-bold text-fg mb-1">Send welcome letter to {app.name}?</h2>
        <p className="text-body-sm text-fg-muted mb-5">
          This will send the welcome letter to{' '}
          <span className="font-semibold text-fg">{app.email}</span> and mark it as sent in the system.
        </p>
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
