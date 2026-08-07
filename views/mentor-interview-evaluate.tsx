'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Slider from '@/components/ui-legacy/slider';
import {
  Check, X, ChevronLeft, ChevronDown, Loader2, CalendarCheck, ClipboardCheck, ExternalLink,
  MessageSquare, Send,
} from 'lucide-react';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import { getCvHighlights } from '@/lib/cv-extract';
import { getEngagements } from '@/lib/participants';
import { cn, mentorIdMatches } from '@/lib/utils';
import { useRole } from '@/lib/role';
import { addNotification } from '@/lib/notifications';
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

/* ── Scoring ───────────────────────────────────────────────────────────────── */
const SCORE_ATTRS = [
  { key: 'technicalKnowledge' as const, label: 'Technical Knowledge' },
  { key: 'problemSolving'     as const, label: 'Problem Solving'     },
  { key: 'communication'      as const, label: 'Communication'       },
  { key: 'initiativeDrive'    as const, label: 'Initiative & Drive'  },
] as const;

type ScoreKey = typeof SCORE_ATTRS[number]['key'];
type Scores   = Record<ScoreKey, number>;

const DEFAULT_SCORES: Scores = {
  technicalKnowledge: 7, problemSolving: 7, communication: 7, initiativeDrive: 7,
};

function avgScore(s: Scores): number {
  const v = Object.values(s);
  return v.reduce((a, b) => a + b, 0) / v.length;
}
function scoreColor(v: number) {
  return v >= 8 ? 'text-success' : v >= 6 ? 'text-accent' : v >= 4 ? 'text-warning' : 'text-danger';
}

function generateAiSummary(
  scores: Scores,
  notes: string,
  app: Application,
  project: ProjectEntry | null,
): string {
  const avg   = avgScore(scores);
  const pairs = SCORE_ATTRS.map(a => ({ label: a.label, score: scores[a.key] }))
                  .sort((a, b) => b.score - a.score);
  const top  = pairs[0];
  const weak = pairs[pairs.length - 1];

  const yearStr  = app.year > 0 ? `Year ${app.year}` : null;
  const gpaStr   = app.gpa  > 0 ? `GPA ${app.gpa.toFixed(2)}` : null;
  const profile  = [yearStr, app.course, app.school, gpaStr].filter(Boolean);
  const p1intro  = profile.length > 0
    ? `${app.name} is a ${profile.join(', ')}.`
    : `${app.name} applied for this internship.`;
  const p1achiev = app.achievements?.length > 0
    ? ` Notable background: ${app.achievements.slice(0, 2).join('; ')}.`
    : '';
  // CV-derived signals — the same inputs that power the candidate's CV summary
  const { leadership, activities } = getCvHighlights(app);
  const p1lead = leadership.length ? ` Shows leadership — ${leadership.slice(0, 2).join('; ')}.` : '';
  const p1cca  = activities.length ? ` Active in co-curriculars including ${activities.slice(0, 2).join(' and ')}.` : '';
  const eng     = getEngagements(app.email);
  const interns = eng.filter(e => e.kind === 'internship').length;
  const courses = eng.filter(e => e.kind === 'techup-course').length;
  const engBits: string[] = [];
  if (interns) engBits.push(`${interns} prior DSTA internship${interns > 1 ? 's' : ''}`);
  if (courses) engBits.push(`${courses} TechUp course${courses > 1 ? 's' : ''}`);
  const p1dsta = engBits.length
    ? ` Has ${engBits.join(' and ')} — a sustained track record with DSTA.`
    : app.previousDSTA
    ? ` Has prior DSTA exposure${app.previousDSTADetails ? ` (${app.previousDSTADetails})` : ''}, a positive signal for cultural fit.`
    : '';
  const para1 = p1intro + p1achiev + p1lead + p1cca + p1dsta;

  const tier =
    avg >= 8.5 ? 'exceptional' : avg >= 7.5 ? 'strong'
    : avg >= 6.5 ? 'solid'    : avg >= 5.5  ? 'developing' : 'below average';
  const strengthLine = top.score >= 8
    ? `${top.label} was a clear strength (${top.score.toFixed(1)}/10), with genuine depth evident during the interview.`
    : `${top.label} led at ${top.score.toFixed(1)}/10.`;
  const weaknessLine = weak.score < 6
    ? `${weak.label} scored ${weak.score.toFixed(1)}/10 — this area warrants careful consideration.`
    : weak.score < 7.5
    ? `${weak.label} (${weak.score.toFixed(1)}/10) was the comparatively weaker area.`
    : `All four dimensions were within a tight range, indicating balanced performance.`;
  const notesLine = notes.trim().length > 40
    ? `Interview notes have been recorded and provide additional context for this assessment.`
    : `Interview notes are brief — more detail would better support the final recommendation.`;
  const para2 = `Interview performance was ${tier} overall, with a composite score of ${avg.toFixed(1)}/10. ${strengthLine} ${weaknessLine} ${notesLine}`;

  const projSkills = project?.skills?.slice(0, 3) ?? [];
  const fitIntro = projSkills.length > 0
    ? `This project requires ${projSkills.join(', ')}.`
    : `No specific skills listed for this project.`;
  const fitAssess = projSkills.length > 0
    ? ` The candidate's interview performance ${avg >= 7.5 ? 'shows strong alignment with' : avg >= 6.0 ? 'shows partial alignment with' : 'highlights gaps against'} these requirements.`
    : '';
  const para3 = fitIntro + fitAssess;

  return [para1, para2, para3].join('\n\n');
}

function fmtSlot(slot: { date: string; time: string; duration?: string }): string {
  const d       = new Date(slot.date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  const [h, m]  = slot.time.split(':').map(Number);
  const suffix  = h >= 12 ? 'PM' : 'AM';
  const timeStr = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  return slot.duration ? `${dateStr} · ${timeStr} (${slot.duration})` : `${dateStr} · ${timeStr}`;
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function MentorInterviewEvaluatePage() {
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

  const detailHref = `/mentor/interviews/${id}`;

  /* ── Form state ────────────────────────────────────────────────────────── */
  const [scores,          setScores]          = useState<Scores>(DEFAULT_SCORES);
  const [saved,           setSaved]           = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'Accepted' | 'Rejected' | null>(null);
  const [rejectionRemark, setRejectionRemark] = useState('');
  const [aiSummary,       setAiSummary]       = useState('');
  const [generating,      setGenerating]      = useState(false);
  const [showNotes,       setShowNotes]       = useState(true);

  /* ── AI Chat ─────────────────────────────────────────────────────────────── */
  type ChatMsg = { role: 'user' | 'assistant'; content: string };
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput,    setChatInput]    = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!app) return;
    setScores((app.mentorScores as Scores) ?? DEFAULT_SCORES);
    setAiSummary(app.mentorAiSummary ?? '');
  }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const notes = app?.mentorNotes ?? '';
  const transcript = app?.mentorTranscript ?? '';

  function saveApp(updated: Application) {
    const next = apps.map(a => a.id === updated.id ? updated : a);
    setApps(next);
    localStorage.setItem(APP_KEY, JSON.stringify(next));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
  }

  function handleSave(extra?: Partial<Application>) {
    if (!app) return;
    saveApp({ ...app, mentorScores: scores, mentorAiSummary: aiSummary || undefined, ...extra });
    setSaved(true);
    setTimeout(() => setSaved(false), 6000);
  }

  function handleDecisionConfirm() {
    if (!app || !pendingDecision) return;
    saveApp({
      ...app,
      mentorDecision:        pendingDecision,
      mentorScores:          scores,
      mentorAiSummary:       aiSummary || undefined,
      mentorRejectionRemark: pendingDecision === 'Rejected' ? rejectionRemark : undefined,
    });
    if (pendingDecision === 'Accepted') {
      addNotification({ forRole: 'io', title: `Mentor recommends ${app.name} for offer`, body: `${profile.name} has evaluated ${app.name} and recommends extending an offer.`, href: '/applications', tier: 'action' });
    } else {
      addNotification({ forRole: 'io', title: `Mentor did not recommend ${app.name}`, body: `${profile.name} has evaluated ${app.name} and does not recommend an offer.`, href: '/applications', tier: 'info' });
    }
    setPendingDecision(null);
    setRejectionRemark('');
    router.push('/mentor/interviews');
  }

  function handleGenerate() {
    if (!app) return;
    setGenerating(true);
    setAiSummary('');
    // Templated summary (mock AI) — generated locally from the CV/application,
    // scores, notes and transcript. No external API call.
    window.setTimeout(() => {
      setAiSummary(generateAiSummary(scores, notes, app, project ?? null));
      setGenerating(false);
    }, 500);
  }

  async function handleChatSend(text?: string) {
    const content = (text ?? chatInput).trim();
    if (!content || chatLoading || !app) return;
    const userMsg: ChatMsg = { role: 'user', content };
    const next = [...chatMessages, userMsg];
    setChatMessages([...next, { role: 'assistant', content: '' }]);
    setChatInput('');
    setChatLoading(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          context: {
            applicant: {
              name: app.name, school: app.school, course: app.course,
              year: app.year, gpa: app.gpa, achievements: app.achievements,
              previousDSTA: app.previousDSTA, previousDSTADetails: app.previousDSTADetails,
              formValues: app.formValues ?? {},
            },
            scores,
            notes,
            transcript,
            project: project ? { title: project.title, description: project.description, skills: project.skills } : null,
          },
        }),
      });
      if (!res.ok || !res.body) throw new Error('API error');
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setChatMessages([...next, { role: 'assistant', content: full }]);
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      setChatMessages([...next, { role: 'assistant', content: 'Network error — could not reach the server. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  const avg = avgScore(scores);
  const notesReady = notes.trim().length > 0;

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

  /* ── Guards: mentor ownership + only after the interview is completed ───── */
  const myProjectIds = new Set(
    projects.filter(p => mentorIdMatches(p.mentorUserId, profile.email)).map(p => p.id)
  );
  if (app.shortlistedFor && !myProjectIds.has(app.shortlistedFor)) {
    router.push('/mentor/interviews');
    return null;
  }
  if (app.status === 'Interview Scheduled') {
    // Interview hasn't been marked complete yet — evaluate from the detail page flow.
    router.push(detailHref);
    return null;
  }

  const decided = !!app.mentorDecision;

  return (
    <Shell activeRoute="/mentor/interviews">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-label-md mb-3">
        <button onClick={() => router.push('/mentor/interviews')} className="text-fg-muted hover:text-accent transition-colors flex items-center gap-1">
          <ChevronLeft size={14} />Interviews
        </button>
        <span className="text-fg-subtle">/</span>
        <button onClick={() => router.push(detailHref)} className="text-fg-muted hover:text-accent transition-colors truncate">{app.name}</button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold">Evaluation</span>
      </nav>

      {/* Title */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck size={20} className="text-accent" />
          <h1 className="text-headline-lg text-fg">Interview Evaluation</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-24 items-start">

        {/* ── LEFT — context (read-only) ─────────────────────────────────── */}
        <div className="space-y-3">

          {/* Candidate recap */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-headline-md font-bold text-fg">{app.name}</h2>
                <p className="text-body-sm text-fg-muted mt-0.5">{app.school} · {app.course} · Yr {app.year}</p>
                {project && <p className="text-[13px] text-fg-subtle mt-0.5">{project.title}</p>}
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push(`/candidate360/${app.id}?from=interviews`)}>
                <ExternalLink size={13} /> Candidate 360
              </Button>
            </div>
            {slot && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border bg-success-bg border-success/20 mt-3">
                <CalendarCheck size={13} className="text-success shrink-0" />
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-success">Conducted on</p>
                  <p className="text-body-sm font-semibold text-fg">{fmtSlot(slot)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Interview notes (read-only, captured on the interview page) */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <button onClick={() => setShowNotes(v => !v)} className="flex items-center gap-2 w-full text-label-md font-semibold text-fg">
              Interview Notes
              <ChevronDown size={14} className={cn('ml-auto text-fg-muted transition-transform duration-200', showNotes && 'rotate-180')} />
            </button>
            {showNotes && (
              notes.trim()
                ? <p className="mt-3 text-body-sm text-fg leading-relaxed whitespace-pre-wrap">{notes}</p>
                : (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/8 px-3 py-2.5">
                    <p className="text-[13px] text-fg">No notes were recorded for this interview.</p>
                    <Button variant="outline" size="sm" onClick={() => router.push(detailHref)}>Add notes</Button>
                  </div>
                )
            )}
            {transcript && <p className="mt-2 text-[12px] text-fg-subtle">Transcript on file · used by AI</p>}
          </div>
        </div>

        {/* ── RIGHT — scoring + AI summary ───────────────────────────────── */}
        <div className="space-y-3">

          {/* Scoring */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-label-md font-semibold text-fg">Scoring</h2>
              <span className={cn('text-[22px] font-black tabular-nums leading-none', scoreColor(avg))}>
                {avg.toFixed(1)}<span className="text-body-sm font-normal text-fg-muted ml-1">/ 10</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {SCORE_ATTRS.map(attr => (
                <div key={attr.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-body-sm text-fg">{attr.label}</p>
                    <span className={cn('text-body-sm font-bold tabular-nums', scoreColor(scores[attr.key]))}>{scores[attr.key].toFixed(1)}</span>
                  </div>
                  <Slider
                    min={0} max={10} step={0.5}
                    value={scores[attr.key]}
                    onChange={v => setScores(p => ({ ...p, [attr.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* AI summary */}
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <AiSparkleIcon size={13} className="shrink-0" />
              <p className="text-label-md font-semibold text-fg">AI Summary</p>
            </div>
            <p className="text-[12px] text-fg-muted mb-3">Combines the candidate&apos;s CV and application with your scores, notes and transcript into a holistic summary to support your recommendation.</p>
            <Button variant="outline" onClick={handleGenerate} disabled={generating}
              className="text-accent border-accent/30 hover:bg-accent/5 gap-1.5">
              {generating
                ? <><Loader2 size={13} className="animate-spin" />Generating…</>
                : <><AiSparkleIcon size={13} />{aiSummary ? 'Regenerate' : 'Generate'}</>}
            </Button>
            {generating && !aiSummary && (
              <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-border bg-bg-subtle p-3 space-y-2">
                <span className="sr-only">Generating AI summary…</span>
                {[100, 80, 60].map(w => <div key={w} className="h-3 bg-border rounded-full animate-pulse" style={{ width: `${w}%` }} aria-hidden="true" />)}
              </div>
            )}
            {aiSummary && (
              <div className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-2.5">
                {aiSummary.split('\n\n').map((para, i, arr) => (
                  <p key={i} className="text-body-sm text-fg leading-relaxed">
                    {para}
                    {generating && i === arr.length - 1 && (
                      <span className="inline-block w-0.5 h-3.5 bg-accent/70 ml-0.5 animate-pulse align-middle rounded-full" />
                    )}
                  </p>
                ))}
              </div>
            )}
            <p className="mt-2.5 text-[12px] text-fg-subtle">AI-generated — review before recording your decision.</p>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push(detailHref)}>
          <ChevronLeft size={14} />Back to interview
        </Button>
        <div className="flex items-center gap-2">
          {!decided && (
            <Button variant="outline" onClick={() => handleSave()}>
              {saved ? <><Check size={14} />Saved</> : 'Save draft'}
            </Button>
          )}
          {!decided ? (
            <>
              <Button onClick={() => setPendingDecision('Accepted')}>
                <Check size={14} />Recommend
              </Button>
              <Button variant="danger" onClick={() => { setRejectionRemark(''); setPendingDecision('Rejected'); }}>
                <X size={14} />Don&apos;t recommend
              </Button>
            </>
          ) : (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-body-sm font-semibold',
              app.mentorDecision === 'Accepted' ? 'bg-success-bg border-success/30 text-success' : 'bg-danger-bg border-danger/30 text-danger',
            )}>
              {app.mentorDecision === 'Accepted' ? <Check size={13} /> : <X size={13} />}
              {app.mentorDecision === 'Accepted' ? 'Recommended for offer' : 'Not recommended'}
            </div>
          )}
        </div>
      </div>

      {/* Accept / Reject confirm modal */}
      {pendingDecision && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-headline-md text-fg mb-2">
              {pendingDecision === 'Accepted' ? `Recommend ${app.name.split(' ')[0]}?` : `Don't recommend ${app.name.split(' ')[0]}?`}
            </h2>
            <p className="text-body-md text-fg-muted mb-4">
              {pendingDecision === 'Accepted'
                ? 'Your recommendation will be recorded and the IO notified to proceed with an offer.'
                : 'Please provide a brief reason for not recommending this candidate.'}
            </p>
            {pendingDecision === 'Rejected' && (
              <div className="mb-4">
                <label className="block text-label-sm text-fg mb-1.5">
                  Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionRemark}
                  onChange={e => setRejectionRemark(e.target.value)}
                  placeholder="e.g. Technical knowledge below the level required for the project…"
                  className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger/40"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant={pendingDecision === 'Accepted' ? 'primary' : 'danger'}
                disabled={pendingDecision === 'Rejected' && !rejectionRemark.trim()}
                onClick={handleDecisionConfirm}
                className="flex-1 justify-center"
              >
                {pendingDecision === 'Accepted' ? <><Check size={14} />Recommend</> : <><X size={14} />Confirm</>}
              </Button>
              <Button variant="ghost" onClick={() => setPendingDecision(null)} className="flex-1 justify-center">
                Back
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Chat FAB ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 right-6 z-30 flex flex-col items-end gap-3">
        {chatOpen && (
          <div
            className="w-80 sm:w-96 bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 460 }}
          >
            {/* Header */}
            <div className="flex items-start gap-2.5 px-4 py-3 border-b border-border bg-accent/5 shrink-0">
              <AiSparkleIcon size={13} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-fg block">
                  Ask about {app.name.split(' ')[0]}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', notesReady ? 'bg-success' : 'bg-warning')} />
                  <span className="text-[12px] text-fg-subtle leading-none">
                    {notesReady
                      ? `CV · application · scores · notes${transcript ? ' · transcript' : ''}`
                      : 'CV · application · scores — no notes on file'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-fg-muted hover:text-fg transition-colors mt-0.5 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[100px]">
              {chatMessages.length === 0 ? (
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  {[
                    'Summarise their overall performance',
                    'What were their interview strengths?',
                    'How do their skills match the project?',
                    'Any concerns to flag?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => handleChatSend(q)}
                      className="text-[13px] px-3 py-1.5 rounded-full border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-body-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-bg-subtle border border-border text-fg rounded-bl-sm',
                    )}>
                      {msg.content || (
                        <span className="flex gap-1 items-center text-fg-muted">
                          <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-border px-3 py-3 flex items-center gap-2 bg-bg-subtle/50 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Ask about this applicant…"
                disabled={chatLoading}
                className="flex-1 bg-surface rounded-xl border border-border px-3 py-2 text-body-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:opacity-50"
              />
              <button
                onClick={() => handleChatSend()}
                disabled={!chatInput.trim() || chatLoading}
                className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setChatOpen(v => !v)}
          className={cn(
            'w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95',
            chatOpen ? 'bg-fg-strong text-surface' : 'bg-accent text-white hover:bg-accent/90',
          )}
          aria-label="AI chat assistant"
        >
          {chatOpen ? <X size={18} /> : <MessageSquare size={18} />}
        </button>
      </div>

    </Shell>
  );
}
