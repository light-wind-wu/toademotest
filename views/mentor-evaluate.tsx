'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Slider from '@/components/ui-legacy/slider';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { ChevronLeft, User, Briefcase, CalendarDays, Send, Save, CheckCircle2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
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
function saveApps(apps: Application[]) {
  localStorage.setItem(APP_KEY, JSON.stringify(apps));
  localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
}

/* ── Scoring (mirrors the interview evaluation) ─────────────────────────────── */
const EVAL_ATTRS = [
  { key: 'technical'     as const, label: 'Technical Ability'  },
  { key: 'quality'       as const, label: 'Quality of Work'    },
  { key: 'communication' as const, label: 'Communication'      },
  { key: 'initiative'    as const, label: 'Initiative & Drive' },
] as const;
type EvalScores = { technical: number; quality: number; communication: number; initiative: number };
const DEFAULT_EVAL_SCORES: EvalScores = { technical: 7, quality: 7, communication: 7, initiative: 7 };
function evalAvg(s: EvalScores): number {
  const v = Object.values(s);
  return v.reduce((a, b) => a + b, 0) / v.length;
}
function scoreColor(v: number) {
  return v >= 8 ? 'text-success' : v >= 6 ? 'text-accent' : v >= 4 ? 'text-warning' : 'text-danger';
}
function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const REC_OPTS = [
  { value: 'scholarship', label: 'Recommend for Scholarship'    },
  { value: 'rehire',      label: 'Recommend for Re-engagement'  },
  { value: 'neither',     label: 'No recommendation'            },
] as const;

/* ── Draft persistence ─────────────────────────────────────────────────────── */
type Rec = 'scholarship' | 'rehire' | 'neither' | '';
interface EvalDraft { ratings: EvalScores; strengths: string; growth: string; recommend: Rec; }
const draftKey = (id: string) => `dsta_eval_draft_${id}`;
function loadDraft(id: string): EvalDraft | null {
  try { const r = localStorage.getItem(draftKey(id)); return r ? JSON.parse(r) as EvalDraft : null; } catch { return null; }
}
function saveDraftToStorage(id: string, d: EvalDraft) {
  try { localStorage.setItem(draftKey(id), JSON.stringify(d)); } catch {}
}
function clearDraft(id: string) {
  try { localStorage.removeItem(draftKey(id)); } catch {}
}

/* ── Page ──────────────────────────────────────────────────────────────────── */
export default function MentorEvaluate() {
  const { profile } = useRole();
  const params = useParams();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const appId  = (params?.id as string) ?? '';

  const [app,        setApp]        = useState<Application | null | 'loading'>('loading');
  const [project,    setProject]    = useState<ProjectEntry | null>(null);
  const [ratings,    setRatings]    = useState<EvalScores>(DEFAULT_EVAL_SCORES);
  const [strengths,  setStrengths]  = useState('');
  const [growth,     setGrowth]     = useState('');
  const [recommend,  setRecommend]  = useState<Rec>('');
  const [submitting, setSubmitting] = useState(false);
  const [justSaved,  setJustSaved]  = useState(false);

  useEffect(() => {
    const found = loadApps().find(a => a.id === appId) ?? null;
    setApp(found);
    if (found?.shortlistedFor) {
      setProject(loadProjects().find(p => p.id === found.shortlistedFor) ?? null);
    }
    if (found?.mentorEvaluation) {
      setRatings(found.mentorEvaluation.ratings);
      setStrengths(found.mentorEvaluation.strengths);
      setGrowth(found.mentorEvaluation.areasForGrowth);
      setRecommend(found.mentorEvaluation.recommend);
    } else if (found) {
      const d = loadDraft(appId);
      if (d) { setRatings(d.ratings); setStrengths(d.strengths); setGrowth(d.growth); setRecommend(d.recommend); }
    }
  }, [appId]);

  const avg         = evalAvg(ratings);
  const allComplete = recommend !== '' && strengths.trim() !== '' && growth.trim() !== '';

  function saveDraft() {
    saveDraftToStorage(appId, { ratings, strengths, growth, recommend });
    showToast('Draft saved');
  }

  function submit() {
    if (!app || typeof app === 'string' || !allComplete) return;
    setSubmitting(true);
    setTimeout(() => {
      const evaluation = {
        submittedAt:    new Date().toISOString().split('T')[0],
        ratings,
        strengths:      strengths.trim(),
        areasForGrowth: growth.trim(),
        recommend:      recommend as 'scholarship' | 'rehire' | 'neither',
      };
      const updated = { ...app, mentorEvaluation: evaluation };
      saveApps(loadApps().map(a => a.id === updated.id ? updated : a));
      clearDraft(appId);
      addNotification({ forRole: 'io', title: `Evaluation submitted — ${app.name}`, body: `${profile.name} has submitted a post-internship evaluation for ${app.name}. Review it in Candidate 360.`, href: `/candidate360/${app.id}`, tier: 'info' });
      setApp(updated);
      setSubmitting(false);
      setJustSaved(true);
    }, 400);
  }

  if (app === 'loading') return null;

  if (!app) {
    return (
      <Shell activeRoute="/mentor/interns">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-body-md text-fg-muted">Intern not found.</p>
          <Button variant="ghost" onClick={() => router.push('/mentor/interns')}><ChevronLeft size={14} /> Back to My Interns</Button>
        </div>
      </Shell>
    );
  }

  const done = !!app.mentorEvaluation;

  return (
    <Shell activeRoute="/mentor/interns">
      <Toast message={toast} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-5 text-body-sm">
        <button onClick={() => router.push('/mentor/interns')} className="flex items-center gap-1 text-fg-muted hover:text-fg transition-colors">
          <ChevronLeft size={15} /> My Interns
        </button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold">Evaluate {app.name}</span>
      </nav>

      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Award size={20} className="text-accent" />
          <h1 className="text-headline-lg text-fg">Post-Internship Evaluation</h1>
        </div>
      </div>

      {justSaved && (
        <div className="mb-5 flex items-center gap-3 px-5 py-4 bg-success-bg border border-success/20 rounded-2xl">
          <CheckCircle2 size={18} className="text-success shrink-0" />
          <div className="flex-1">
            <p className="text-body-md font-semibold text-fg">Evaluation submitted</p>
            <p className="text-body-sm text-fg-muted">Your evaluation has been sent to the Internship Office.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/mentor/interns')}>Back to My Interns</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

        {/* Left — intern context */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-body-md font-bold text-fg truncate">{app.name}</p>
              <p className="text-body-sm text-fg-muted truncate">{app.school}</p>
            </div>
          </div>
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-surface">
            <div className="flex items-start gap-3 px-4 py-3">
              <Briefcase size={13} className="text-fg-muted mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Project</p>
                <p className="text-body-sm font-semibold text-fg">{project?.title ?? app.shortlistedFor ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <CalendarDays size={13} className="text-fg-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Internship Period</p>
                <p className="text-body-sm font-semibold text-fg">{fmtDate(app.internshipStartDate)} → {fmtDate(app.internshipEndDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — evaluation form */}
        <div className="space-y-3">
          <fieldset disabled={done} className={cn(done && 'opacity-90')}>

            {/* Scoring */}
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-label-md font-semibold text-fg">Scoring</h2>
                <span className={cn('text-[22px] font-black tabular-nums leading-none', scoreColor(avg))}>
                  {avg.toFixed(1)}<span className="text-body-sm font-normal text-fg-muted ml-1">/ 10</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {EVAL_ATTRS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-fg">{label}</span>
                      <span className={cn('text-body-sm font-bold tabular-nums', scoreColor(ratings[key]))}>{ratings[key].toFixed(1)}</span>
                    </div>
                    <Slider min={0} max={10} step={0.5} value={ratings[key]}
                      onChange={v => setRatings(r => ({ ...r, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 mb-3">
              <p className="text-[13px] font-semibold text-fg-muted mb-2">Recommendation <span className="text-danger">*</span></p>
              <div className="flex flex-wrap gap-2">
                {REC_OPTS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setRecommend(opt.value)}
                    className={cn('px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors',
                      recommend === opt.value ? 'bg-accent text-white border-accent' : 'bg-surface text-fg-muted border-border hover:border-accent/40'
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text fields */}
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-fg-muted block mb-1">Key strengths <span className="text-danger">*</span></label>
                <textarea rows={3} value={strengths} onChange={e => setStrengths(e.target.value)}
                  placeholder="What did this intern do particularly well?"
                  className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-fg-muted block mb-1">Areas for growth <span className="text-danger">*</span></label>
                <textarea rows={3} value={growth} onChange={e => setGrowth(e.target.value)}
                  placeholder="What could this intern improve on?"
                  className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
          </fieldset>

          {!done ? (
            <div className="flex justify-end gap-2 pt-1">
              <Button disabled={!allComplete || submitting} onClick={submit}>
                <Send size={13} />{submitting ? 'Submitting…' : 'Submit Evaluation'}
              </Button>
              <Button variant="outline" onClick={saveDraft}><Save size={13} /> Save Draft</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1">
              <p className="inline-flex items-center gap-1.5 text-body-sm text-success font-medium">
                <CheckCircle2 size={14} /> Submitted {fmtDate(app.mentorEvaluation!.submittedAt)}
              </p>
              <Button variant="outline" onClick={() => router.push('/mentor/interns')}>Back to My Interns</Button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
