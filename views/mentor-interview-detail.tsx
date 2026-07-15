'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import {
  CalendarClock, CalendarCheck, Video, Check, X,
  ChevronLeft, ClipboardCheck,
  Upload, FileText, ExternalLink,
} from 'lucide-react';
import AiSummaryCard from '@/components/ui-legacy/ai-summary-card';
import { getEngagements } from '@/lib/participants';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import type { Application, ProjectEntry } from '@/lib/types';
import { loadProjects } from '@/lib/storage';
import seedData from '@/data/applications.json';

/* ── Storage ───────────────────────────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    const existing: Application[] = raw ? JSON.parse(raw) : [];
    const seedArr = seedData as Application[];
    const eIds = new Set(existing.map((a: Application) => a.id));
    const merged = [...existing, ...seedArr.filter((a: Application) => !eIds.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return merged;
  } catch { return seedData as Application[]; }
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function fmtSlot(slot: { date: string; time: string; duration?: string }): string {
  const d       = new Date(slot.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  const [h, m]  = slot.time.split(':').map(Number);
  const suffix  = h >= 12 ? 'PM' : 'AM';
  const timeStr = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  return slot.duration ? `${dateStr} · ${timeStr} (${slot.duration})` : `${dateStr} · ${timeStr}`;
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function MentorInterviewDetailPage() {
  const params  = useParams();
  const id      = params?.id as string;
  const router  = useRouter();
  const { profile } = useRole();

  const [apps,     setApps]     = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());
  }, []);

  const app     = apps.find(a => a.id === id) ?? null;
  const project = app?.shortlistedFor ? projects.find(p => p.id === app.shortlistedFor) : null;
  const slot    = app?.interviewSlots?.[app?.confirmedSlot ?? -1];
  const isUpcoming = app?.status === 'Interview Scheduled';
  const evalHref = `/mentor/interviews/${id}/evaluate`;

  /* ── Local form state ──────────────────────────────────────────────────── */
  const [notes,             setNotes]             = useState('');
  const [saved,             setSaved]             = useState(false);
  const [confirmComplete,   setConfirmComplete]   = useState(false);
  const [transcript,        setTranscript]        = useState('');
  const [transcriptFileName, setTranscriptFileName] = useState('');

  useEffect(() => {
    if (!app) return;
    setNotes(app.mentorNotes ?? '');
    setTranscript(app.mentorTranscript ?? '');
    setTranscriptFileName(app.mentorTranscript ? 'transcript.txt' : '');
  }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveApp(updated: Application) {
    const next = apps.map(a => a.id === updated.id ? updated : a);
    setApps(next);
    localStorage.setItem(APP_KEY, JSON.stringify(next));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
  }

  function handleSave(extra?: Partial<Application>) {
    if (!app) return;
    saveApp({
      ...app,
      mentorNotes:      notes,
      mentorTranscript: transcript || undefined,
      ...extra,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleMarkComplete() {
    if (!app) return;
    saveApp({
      ...app,
      status:           'Interview Completed',
      mentorNotes:      notes,
      mentorTranscript: transcript || undefined,
    });
    setConfirmComplete(false);
    router.push(evalHref);
  }

  function handleTranscriptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTranscriptFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) ?? '';
      setTranscript(text.slice(0, 12000)); // cap at ~3k tokens
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const notesReady = notes.trim().length > 0;
  const hasDraft   = notesReady || !!transcript;

  /* ── Loading / not found ───────────────────────────────────────────────── */
  if (apps.length > 0 && !app) {
    return (
      <Shell activeRoute="/mentor/interviews">
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="text-body-lg font-semibold text-fg">Interview not found</p>
          <Button variant="ghost" onClick={() => router.push('/mentor/interviews')}>
            <ChevronLeft size={14} />Back to Interviews
          </Button>
        </div>
      </Shell>
    );
  }

  if (!app) return null;

  /* ── Verify this is the mentor's interview ─────────────────────────────── */
  const myProjectIds = new Set(
    projects
      .filter(p => mentorIdMatches(p.mentorUserId, profile.email))
      .map(p => p.id)
  );
  if (app.shortlistedFor && !myProjectIds.has(app.shortlistedFor)) {
    router.push('/mentor/interviews');
    return null;
  }

  return (
    <Shell activeRoute="/mentor/interviews">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-label-md mb-3">
        <button
          onClick={() => router.push('/mentor/interviews')}
          className="text-fg-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={14} />Interviews
        </button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold truncate">{app.name}</span>
      </nav>

      {/* Two-column grid — left: context, right: notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-20 items-start">

        {/* ── LEFT — applicant context ──────────────────────────────────── */}
        <div className="space-y-3">

          {/* Header card */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-headline-md font-bold text-fg">{app.name}</h1>
                <p className="text-body-sm text-fg-muted mt-0.5">{app.school} · {app.course} · Yr {app.year}</p>
                {project && <p className="text-[13px] text-fg-subtle mt-0.5">{project.title}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => router.push(`/candidate360/${app.id}?from=interviews`)}>
                  <ExternalLink size={13} /> Candidate 360
                </Button>
                {isUpcoming && app.meetingLink && (
                  <a
                    href={app.meetingLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-semibold hover:bg-accent/90 transition-colors"
                  >
                    <Video size={12} />Join
                  </a>
                )}
                <span className={cn(
                  'text-[13px] font-bold px-2.5 py-1 rounded-full',
                  isUpcoming ? 'bg-accent/10 text-accent' : 'bg-warning-bg text-warning',
                )}>
                  {isUpcoming ? 'Upcoming' : 'Pending Evaluation'}
                </span>
              </div>
            </div>
            {slot && (
              <div className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl border mt-3',
                isUpcoming ? 'bg-accent/5 border-accent/20' : 'bg-success-bg border-success/20',
              )}>
                {isUpcoming
                  ? <CalendarClock size={13} className="text-accent shrink-0" />
                  : <CalendarCheck size={13} className="text-success shrink-0" />}
                <div>
                  <p className={cn('text-[12px] font-bold uppercase tracking-wide', isUpcoming ? 'text-accent' : 'text-success')}>
                    {isUpcoming ? 'Scheduled for' : 'Conducted on'}
                  </p>
                  <p className="text-body-sm font-semibold text-fg">{fmtSlot(slot)}</p>
                </div>
              </div>
            )}
          </div>

          {/* AI summary — same context the IO sees in Candidate 360 */}
          <AiSummaryCard app={app} engagements={getEngagements(app.email)} />
        </div>

        {/* ── RIGHT — notes + transcript ────────────────────────────────── */}
        <div className="space-y-3">

          {/* Notes + Transcript */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-label-md font-semibold text-fg">Interview Notes</h2>
              {isUpcoming && <span className="text-[13px] text-fg-muted">take live notes</span>}
            </div>
            <textarea
              className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              rows={12}
              placeholder={isUpcoming
                ? 'Key observations, standout moments, areas of concern, memorable answers…'
                : 'Summarise your observations — technical depth, communication style, strengths and concerns…'
              }
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            {/* Transcript row */}
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
              <FileText size={13} className="text-fg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-fg">Transcript</span>
                <span className="text-[13px] text-fg-muted ml-1.5">optional · used by AI</span>
              </div>
              {transcript ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] text-fg-muted truncate max-w-[140px]">{transcriptFileName}</span>
                  <span className="text-[12px] text-fg-subtle">({(transcript.length / 1000).toFixed(1)}k)</span>
                  <button
                    onClick={() => { setTranscript(''); setTranscriptFileName(''); }}
                    className="text-fg-muted hover:text-danger transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-1.5 text-[12px] font-semibold text-accent cursor-pointer hover:text-accent/80 transition-colors shrink-0">
                  <Upload size={13} />Upload .txt
                  <input type="file" accept=".txt" className="hidden" onChange={handleTranscriptUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Hand-off to evaluation (after the interview is completed) */}
          {!isUpcoming && (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-4 flex items-center gap-3">
              <ClipboardCheck size={18} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-semibold text-fg">
                  {app.mentorDecision ? 'Evaluation recorded' : 'Ready to evaluate'}
                </p>
                <p className="text-[13px] text-fg-muted">
                  {app.mentorDecision
                    ? `You ${app.mentorDecision === 'Accepted' ? 'recommended' : 'did not recommend'} ${app.name.split(' ')[0]}.`
                    : 'Scoring and your recommendation are on a dedicated page.'}
                </p>
              </div>
              <Button variant={app.mentorDecision ? 'outline' : 'primary'} size="sm" onClick={() => router.push(evalHref)}>
                {app.mentorDecision ? 'View evaluation' : 'Evaluate & score'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/mentor/interviews')}>
          <ChevronLeft size={14} />Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!hasDraft} onClick={() => handleSave()}>
            {saved ? <><Check size={14} />Saved</> : 'Save'}
          </Button>
          {isUpcoming ? (
            <Button onClick={() => setConfirmComplete(true)}>
              <CalendarCheck size={14} />Mark as Completed
            </Button>
          ) : (
            <Button onClick={() => router.push(evalHref)}>
              <ClipboardCheck size={14} />{app.mentorDecision ? 'View evaluation' : 'Evaluate & score'}
            </Button>
          )}
        </div>
      </div>

      {/* Mark as Completed confirm */}
      {confirmComplete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-headline-md text-fg mb-2">Mark as Completed?</h2>
            <p className="text-body-md text-fg-muted mb-5">
              Confirm that the interview with <span className="font-semibold text-fg">{app.name.split(' ')[0]}</span> has taken place.
              {hasDraft ? ' Your notes will be saved' : ''} and you&apos;ll move on to scoring.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleMarkComplete} className="flex-1 justify-center">
                <Check size={14} />Confirm
              </Button>
              <Button variant="ghost" onClick={() => setConfirmComplete(false)} className="flex-1 justify-center">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

    </Shell>
  );
}
