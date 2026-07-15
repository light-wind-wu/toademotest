'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { ChevronLeft, Award, User, Briefcase, Clock, Check } from 'lucide-react';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import { cn } from '@/lib/utils';
import CertificatePreview, { loadActiveCertStyle, type CertStyle } from '@/components/certificate-preview';
import seedApps from '@/data/applications.json';

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

function fmtDate(d: string | undefined) {
  return d ? new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}


/* ── Style thumbnails ─────────────────────────────────────────────────────── */
const STYLE_META: Record<CertStyle, { label: string; desc: string; accent: string }> = {
  classic: { label: 'Classic',  desc: 'Navy double border, traditional layout', accent: '#00328a' },
  modern:  { label: 'Modern',   desc: 'Clean geometric, left accent strip',     accent: '#00328a' },
  formal:  { label: 'Formal',   desc: 'Cream background, gold ornamental border', accent: '#b8975a' },
};

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function CertificateCompose() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const appId        = searchParams.get('appId') ?? '';
  const { toast, showToast } = useToast();

  const [app,          setApp]          = useState<Application | null>(null);
  const [project,      setProject]      = useState<ProjectEntry | null>(null);
  // Style is configured in Templates → Certificates; the issue flow just applies it
  const [selectedStyle, setSelectedStyle] = useState<CertStyle>('classic');
  const [loaded,       setLoaded]       = useState(false);
  const [confirmSend,  setConfirmSend]  = useState(false);

  useEffect(() => {
    const apps     = loadApps();
    const projects = loadProjects();
    const found    = apps.find(a => a.id === appId) ?? null;
    const proj     = found?.shortlistedFor ? (projects.find(p => p.id === found.shortlistedFor) ?? null) : null;
    setApp(found);
    setProject(proj);
    setSelectedStyle(loadActiveCertStyle());
    setLoaded(true);
  }, [appId]);

  function doIssue() {
    if (!app) return;
    const today   = new Date().toISOString().split('T')[0];
    const apps    = loadApps();
    const updated = apps.map(a => a.id === app.id ? { ...a, cocSent: true, cocSentDate: today, cocStyle: selectedStyle } : a);
    saveApps(updated);
    showToast(`Certificate issued to ${app.name}`);
    setTimeout(() => router.push('/interns'), 1200);
  }

  if (!loaded) return null;

  if (!app) return (
    <Shell activeRoute="/interns">
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-body-md text-fg-muted">Application not found.</p>
        <Button variant="ghost" onClick={() => router.push('/interns')}><ChevronLeft size={14} />Back</Button>
      </div>
    </Shell>
  );

  return (
    <Shell activeRoute="/interns">
      <Toast message={toast} />

      {/* Action bar */}
      <div className="sticky top-[64px] z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-bg border-b border-border flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-body-sm">
          <button onClick={() => router.push('/interns')} className="flex items-center gap-1 text-fg-muted hover:text-fg transition-colors">
            <ChevronLeft size={15} />Interns
          </button>
          <span className="text-fg-subtle">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Award size={12} className="text-accent" />
            </div>
            <span className="text-fg font-semibold">Issue Certificate</span>
            <span className="text-fg-muted">→ {app.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setConfirmSend(true)}>
            <Award size={14} />Issue Certificate
          </Button>
          <Button variant="ghost" onClick={() => router.push('/interns')}>Cancel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">

        {/* Left sidebar */}
        <div className="space-y-4">

          {/* Recipient */}
          <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-body-md font-bold text-fg">{app.name}</p>
              <p className="text-body-sm text-fg-muted">{app.school}</p>
              <p className="text-body-sm text-fg-muted">{app.email}</p>
            </div>
          </div>

          {/* Internship details */}
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-start gap-3 px-4 py-3">
              <Briefcase size={13} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Programme</p>
                <p className="text-body-sm font-semibold text-fg">{app.programmeName}</p>
              </div>
            </div>
            {project && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Award size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Project</p>
                  <p className="text-body-sm font-semibold text-fg">{project.title}</p>
                  {project.mentor && <p className="text-[13px] text-fg-muted mt-0.5">{project.mentor}</p>}
                </div>
              </div>
            )}
            {(app.internshipStartDate || app.internshipEndDate) && (
              <div className="flex items-start gap-3 px-4 py-3">
                <Clock size={13} className="text-fg-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Period</p>
                  <p className="text-body-sm text-fg">
                    {fmtDate(app.internshipStartDate)} – {fmtDate(app.internshipEndDate)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Certificate style — configured in Templates → Certificates */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <p className="px-4 py-2.5 text-[12px] font-bold uppercase tracking-widest text-fg-subtle border-b border-border">Certificate Style</p>
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: STYLE_META[selectedStyle].accent }}>
                  <Check size={11} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold text-fg">{STYLE_META[selectedStyle].label}</p>
                  <p className="text-[13px] text-fg-subtle">{STYLE_META[selectedStyle].desc}</p>
                </div>
              </div>
              <p className="text-[12px] text-fg-muted mt-3 pt-3 border-t border-border">
                Style is set in <button onClick={() => router.push('/templates')} className="font-semibold text-accent hover:underline">Templates → Certificates</button>.
              </p>
            </div>
          </div>
        </div>

        {/* Certificate preview */}
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-3">Preview</p>
          <CertificatePreview app={app} project={project} style={selectedStyle} />
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal open={confirmSend} onClose={() => setConfirmSend(false)} labelledBy="issue-certificate-title">
        <h2 id="issue-certificate-title" className="text-headline-sm font-bold text-fg mb-1">Issue certificate to {app.name}?</h2>
        <p className="text-body-sm text-fg-muted mb-5">
          This will send the <strong>{STYLE_META[selectedStyle].label}</strong> certificate to{' '}
          <span className="font-semibold text-fg">{app.email}</span> and mark it as issued.
        </p>
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { setConfirmSend(false); doIssue(); }}>
            <Award size={14} />Confirm
          </Button>
          <Button variant="ghost" onClick={() => setConfirmSend(false)}>Cancel</Button>
        </div>
      </Modal>
    </Shell>
  );
}
