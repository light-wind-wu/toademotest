'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import { useRole } from '@/lib/role';
import { ChevronLeft, Star, Send, CheckCircle2, MessageSquareHeart, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addNotification } from '@/lib/notifications';
import type { Application } from '@/lib/types';
import applicationsSeed from '@/data/applications.json';

const IO_APPS_KEY     = 'dsta_applications';
const IO_APPS_VER_KEY = 'dsta_applications_seed_v';
const IO_APPS_VER     = '31';

function loadIoApps(): Application[] {
  try {
    const ver = localStorage.getItem(IO_APPS_VER_KEY);
    if (ver !== IO_APPS_VER) return applicationsSeed as Application[];
    const r = localStorage.getItem(IO_APPS_KEY);
    return r ? (JSON.parse(r) as Application[]) : (applicationsSeed as Application[]);
  } catch { return applicationsSeed as Application[]; }
}
function saveIoApps(apps: Application[]) {
  localStorage.setItem(IO_APPS_KEY, JSON.stringify(apps));
  localStorage.setItem(IO_APPS_VER_KEY, IO_APPS_VER);
}

/* ── Draft persistence ─────────────────────────────────────────────────── */
interface FbDraft {
  ratings:    { calibration: number; sentiment: number; mentorship: number; environment: number };
  scopeFit:   'too-easy' | 'just-right' | 'too-hard' | '';
  recommend:  number | null;
  highlights: string;
  improvements: string;
  mentorMsg:  string;
}
const draftKey = (id: string) => `dsta_feedback_draft_${id}`;
function loadDraft(id: string): FbDraft | null {
  try { const r = localStorage.getItem(draftKey(id)); return r ? JSON.parse(r) as FbDraft : null; } catch { return null; }
}
function saveDraftToStorage(id: string, d: FbDraft) {
  try { localStorage.setItem(draftKey(id), JSON.stringify(d)); } catch {}
}
function clearDraft(id: string) {
  try { localStorage.removeItem(draftKey(id)); } catch {}
}

/* ── Form helpers ──────────────────────────────────────────────────────── */
function FbCard({ num, title, hint, children }: { num: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-[12px] font-bold flex items-center justify-center shrink-0">{num}</span>
        <div>
          <p className="text-body-md font-semibold text-fg leading-tight">{title}</p>
          <p className="text-[12px] text-fg-muted">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FbStarRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-body-sm text-fg">{label} <span className="text-danger">*</span></span>
      <div className="flex gap-1 shrink-0 pt-0.5">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <Star size={20} className={cn('transition-colors', n <= value ? 'text-warning fill-warning' : 'text-border hover:text-fg-muted')} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function ApplyFeedback() {
  const { profile } = useRole();
  const params = useParams();
  const router = useRouter();
  const { toast, showToast } = useToast();
  const appId  = (params?.id as string) ?? '';

  const [app,          setApp]          = useState<Application | null | 'loading'>('loading');
  const [fbRatings,    setFbRatings]    = useState({ calibration: 0, sentiment: 0, mentorship: 0, environment: 0 });
  const [fbScopeFit,   setFbScopeFit]   = useState<'too-easy' | 'just-right' | 'too-hard' | ''>('');
  const [fbRecommend,  setFbRecommend]  = useState<number | null>(null);
  const [fbHighlights, setFbHighlights] = useState('');
  const [fbImprove,    setFbImprove]    = useState('');
  const [fbMentorMsg,  setFbMentorMsg]  = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [justSaved,    setJustSaved]    = useState(false);

  useEffect(() => {
    const found = loadIoApps().find(a => a.id === appId) ?? null;
    setApp(found);
    // Restore a saved draft if the feedback hasn't been submitted yet
    if (found && !found.internFeedback) {
      const d = loadDraft(appId);
      if (d) {
        setFbRatings(d.ratings);
        setFbScopeFit(d.scopeFit);
        setFbRecommend(d.recommend);
        setFbHighlights(d.highlights);
        setFbImprove(d.improvements);
        setFbMentorMsg(d.mentorMsg);
      }
    }
  }, [appId]);

  const fbComplete =
    Object.values(fbRatings).every(v => v > 0) &&
    fbScopeFit !== '' && fbRecommend !== null &&
    fbHighlights.trim() !== '' && fbImprove.trim() !== '' && fbMentorMsg.trim() !== '';

  function currentDraft(): FbDraft {
    return { ratings: fbRatings, scopeFit: fbScopeFit, recommend: fbRecommend, highlights: fbHighlights, improvements: fbImprove, mentorMsg: fbMentorMsg };
  }

  function saveDraft() {
    saveDraftToStorage(appId, currentDraft());
    showToast('Draft saved');
  }

  function submitFeedback() {
    if (!app || typeof app === 'string' || !fbComplete) return;
    setFbSubmitting(true);
    setTimeout(() => {
      const feedback = {
        submittedAt:   new Date().toISOString().split('T')[0],
        ratings:       fbRatings,
        scopeFit:      fbScopeFit as 'too-easy' | 'just-right' | 'too-hard',
        recommend:     fbRecommend as number,
        highlights:    fbHighlights.trim(),
        improvements:  fbImprove.trim(),
        mentorMessage: fbMentorMsg.trim() || undefined,
      };
      const updated = { ...app, internFeedback: feedback };
      saveIoApps(loadIoApps().map(a => a.id === updated.id ? updated : a));
      clearDraft(appId);
      addNotification({ forRole: 'io', title: `Internship feedback received — ${app.name}`, body: `${app.name} has submitted their post-internship feedback.`, href: `/candidate360/${app.id}`, tier: 'info' });
      if (fbMentorMsg.trim()) {
        addNotification({ forRole: 'mentor', title: `Message from your intern — ${app.name}`, body: fbMentorMsg.trim(), href: '/mentor/interns', tier: 'info' });
      }
      setApp(updated);
      setFbSubmitting(false);
      setJustSaved(true);
    }, 400);
  }

  if (app === 'loading') return null;

  if (!app || app.email !== profile.email) {
    return (
      <Shell activeRoute="/apply/internship">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-body-md text-fg-muted">Feedback form not available.</p>
          <Button variant="ghost" onClick={() => router.push('/apply/internship')}><ChevronLeft size={14} /> Back to My Internship</Button>
        </div>
      </Shell>
    );
  }

  const alreadyDone = !!app.internFeedback && !justSaved;

  return (
    <Shell activeRoute="/apply/internship">
      <Toast message={toast} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-5 text-body-sm">
        <button onClick={() => router.push('/apply/internship')} className="flex items-center gap-1 text-fg-muted hover:text-fg transition-colors">
          <ChevronLeft size={15} /> My Internship
        </button>
        <span className="text-fg-subtle">/</span>
        <span className="text-fg font-semibold">Feedback</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquareHeart size={20} className="text-accent" />
            <h1 className="text-headline-lg text-fg">Post-Internship Feedback</h1>
          </div>
        </div>
        {!justSaved && !alreadyDone && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={saveDraft}><Save size={13} /> Save Draft</Button>
            <Button disabled={!fbComplete || fbSubmitting} onClick={submitFeedback}>
              <Send size={13} />{fbSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          </div>
        )}
      </div>

      {(justSaved || alreadyDone) ? (
        <div className="flex items-center gap-3 px-5 py-4 bg-success-bg border border-success/20 rounded-2xl max-w-2xl">
          <CheckCircle2 size={18} className="text-success shrink-0" />
          <div className="flex-1">
            <p className="text-body-md font-semibold text-fg">Feedback submitted</p>
            <p className="text-body-sm text-fg-muted">Thank you — your feedback has been received.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/apply/internship')}>Back</Button>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Rating dimensions — 2×2 grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* 1 — Programme Calibration */}
            <FbCard num={1} title="Programme Calibration" hint="Help us pitch projects at the right level.">
              <FbStarRow label="The project scope was well-matched to my abilities and helped me learn"
                value={fbRatings.calibration} onChange={n => setFbRatings(r => ({ ...r, calibration: n }))} />
              <div className="pt-1">
                <p className="text-body-sm text-fg mb-2">How did the project difficulty feel overall? <span className="text-danger">*</span></p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { v: 'too-easy'   as const, label: 'Too easy'        },
                    { v: 'just-right' as const, label: 'Just right'      },
                    { v: 'too-hard'   as const, label: 'Too challenging' },
                  ]).map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => setFbScopeFit(v)}
                      className={cn('px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors',
                        fbScopeFit === v ? 'bg-accent text-white border-accent' : 'bg-surface text-fg-muted border-border hover:border-accent/40'
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </FbCard>

            {/* 2 — Overall Sentiment */}
            <FbCard num={2} title="Overall Experience" hint="Your overall impression of the programme.">
              <FbStarRow label="Overall, my internship experience met or exceeded my expectations"
                value={fbRatings.sentiment} onChange={n => setFbRatings(r => ({ ...r, sentiment: n }))} />
              <div className="pt-1">
                <p className="text-body-sm text-fg mb-2">How likely are you to recommend a DSTA internship to a peer? <span className="text-danger">*</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button key={n} type="button" onClick={() => setFbRecommend(n)}
                      className={cn('w-8 h-8 rounded-lg text-[13px] font-bold border transition-colors tabular-nums',
                        fbRecommend === n ? 'bg-accent text-white border-accent' : 'bg-surface text-fg-muted border-border hover:border-accent/40'
                      )}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[12px] text-fg-subtle mt-1.5 max-w-[360px]">
                  <span>Not likely</span><span>Extremely likely</span>
                </div>
              </div>
            </FbCard>

            {/* 3 — Mentorship */}
            <FbCard num={3} title="Mentorship" hint="Quality and effectiveness of your mentor's guidance.">
              <FbStarRow label="My mentor provided effective, high-quality guidance and support"
                value={fbRatings.mentorship} onChange={n => setFbRatings(r => ({ ...r, mentorship: n }))} />
            </FbCard>

            {/* 4 — Work Environment */}
            <FbCard num={4} title="Work Environment" hint="Team culture and workplace experience.">
              <FbStarRow label="The team culture and work environment were welcoming and supportive"
                value={fbRatings.environment} onChange={n => setFbRatings(r => ({ ...r, environment: n }))} />
            </FbCard>
          </div>

          {/* Written responses — full width */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <p className="text-body-md font-semibold text-fg mb-4">Written Responses</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-fg-muted block mb-1">Highlights <span className="text-danger">*</span></label>
                <textarea rows={4} value={fbHighlights} onChange={e => setFbHighlights(e.target.value)}
                  placeholder="What did you enjoy most about the internship?"
                  className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-fg-muted block mb-1">Suggestions <span className="text-danger">*</span></label>
                <textarea rows={4} value={fbImprove} onChange={e => setFbImprove(e.target.value)}
                  placeholder="What could be improved?"
                  className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-[13px] font-semibold text-fg-muted block mb-1">Message to Mentor <span className="text-danger">*</span></label>
              <textarea rows={3} value={fbMentorMsg} onChange={e => setFbMentorMsg(e.target.value)}
                placeholder="Leave a personal note for your mentor…"
                className="w-full px-3 py-2 text-body-sm border border-border rounded-lg bg-bg-subtle resize-none focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button disabled={!fbComplete || fbSubmitting} onClick={submitFeedback}>
              <Send size={13} />{fbSubmitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
            <Button variant="outline" onClick={saveDraft}><Save size={13} /> Save Draft</Button>
          </div>
        </div>
      )}
    </Shell>
  );
}
