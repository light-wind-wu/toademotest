'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Shell from '@/components/layout/shell';
import Button from '@/components/ui-legacy/button';
import Modal from '@/components/ui-legacy/modal';
import { Toast, useToast } from '@/components/ui-legacy/toast';
import {
  ChevronRight, GraduationCap, Award, History,
  CalendarDays, Briefcase, CheckCircle2, XCircle, UserCheck,
  Clock, AlertTriangle, UserX, Mail, Check, X, FileText,
  CalendarClock, CalendarCheck, MapPin, Video,
  ChevronDown, Star, SlidersHorizontal, GripVertical,
  Eye, EyeOff, Lock, ShieldCheck, RefreshCw, Folder, Repeat,
  Info, Download, ClipboardList, Trophy, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import DocLink from '@/components/ui-legacy/doc-link';
import AiSummaryCard from '@/components/ui-legacy/ai-summary-card';
import { logAccess, getAccessLog, type AccessLogEntry } from '@/lib/audit';
import { cn, mentorIdMatches } from '@/lib/utils';
import { loadWeights, saveWeights, reweightScore, calcSkillsScore, calcDisciplineScore, backfillScoreComponents, type ScoringWeights } from '@/lib/scoring';
import type { Application, ApplicationStatus, ProjectEntry, DSTAEngagementEntry, DSTAEngagementKind, UserRole } from '@/lib/types';
import seedData from '@/data/applications.json';
import { loadProjects } from '@/lib/storage';
import { getEngagements } from '@/lib/participants';
import { useRole } from '@/lib/role';
import { useSystemConfig } from '@/lib/portal-config';
import { addNotification } from '@/lib/notifications';
import programmesJson from '@/data/programmes.json';
import InterviewScheduleDrawer from '@/components/mentor/interview-schedule-drawer';
import InterviewRescheduleDrawer from '@/components/mentor/interview-reschedule-drawer';
import MarkCompleteConfirm from '@/components/mentor/mark-complete-confirm';

const PROG_NAME: Record<string, string> = Object.fromEntries(
  (programmesJson as { id: string; title: string }[]).map(p => [p.id, p.title])
);
// Programme → categories, for the university Year-of-study guidance (AUG-101).
const PROG_CATEGORY: Record<string, string[]> = Object.fromEntries(
  (programmesJson as { id: string; category?: string[] }[]).map(p => [p.id, p.category ?? []])
);
const TYPICAL_UNI_YEAR = 3; // DSTA HR: university intake is typically Year 3

/* ── Motion: shared FLIP reorder ───────────────────────────────────────────────
   Consistent motion language for any list that re-ranks live (e.g. the programme-
   fit cards when the score weighting changes). When the keyed order changes, each
   item is snapped back to its previous position and animated to its new one via the
   Web Animations API — items glide to their new rank instead of jumping.

   Tokens (the one place we define reorder motion, reused everywhere):
   FLIP_DURATION + FLIP_EASING — a 280ms "decelerate" curve, longer than the 150ms
   PRIZM uses for state changes because translating a whole row a long distance reads
   better with more travel time. Honours prefers-reduced-motion: WAAPI is NOT covered
   by the global reduced-motion CSS (that only neutralises CSS transitions/animations),
   so we gate it explicitly here. */
const FLIP_DURATION = 280;
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/* Called unconditionally at the top of a component (must precede any early return).
   Runs after every commit and animates only the rows whose position actually moved,
   so an unrelated re-render is a cheap no-op. */
function useFlipReorder() {
  const nodes = useRef<Map<string, HTMLElement>>(new Map());
  const prevRects = useRef<Map<string, DOMRect>>(new Map());

  const snapshot = () => {
    const map = new Map<string, DOMRect>();
    nodes.current.forEach((el, key) => map.set(key, el.getBoundingClientRect()));
    return map;
  };

  useLayoutEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Only animate true reorders (same set, different order). Skip when the visible
    // count changes — i.e. expand/collapse ("Show all") — which otherwise looks janky.
    const sameCount = prevRects.current.size === nodes.current.size;
    if (!reduced && sameCount && prevRects.current.size) {
      nodes.current.forEach((el, key) => {
        const prev = prevRects.current.get(key);
        if (!prev) return; // newly added — no travel to animate
        const next = el.getBoundingClientRect();
        const dy = prev.top - next.top;
        if (Math.abs(dy) < 1) return;
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }],
          { duration: FLIP_DURATION, easing: FLIP_EASING },
        );
      });
    }
    prevRects.current = snapshot();
  });

  return (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
}

/* ── Mentor evaluation helpers ─────────────────────────────────────────────── */
const SCORE_ATTRS = [
  { key: 'technicalKnowledge', label: 'Technical Knowledge' },
  { key: 'problemSolving',     label: 'Problem Solving'     },
  { key: 'communication',      label: 'Communication'       },
  { key: 'initiativeDrive',    label: 'Initiative & Drive'  },
] as const;
type ScoreKey = typeof SCORE_ATTRS[number]['key'];

function fmtSlot(slot: { date: string; time: string }) {
  const d = new Date(`${slot.date}T${slot.time}`);
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function ScorePipM({ value }: { value: number }) {
  const color = value >= 8 ? 'bg-success' : value >= 6 ? 'bg-accent' : value >= 4 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-body-sm font-bold text-fg w-7 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

/* ── Storage ──────────────────────────────────────────────────────────────── */
const APP_KEY      = 'dsta_applications';
const APP_VER_KEY  = 'dsta_applications_seed_v';
const APP_SEED_VER = '31';

function migrateApps(apps: Application[]): Application[] {
  return apps
    .filter(a => a.id !== 'APP-7100') // one-time cleanup of the removed docs-demo applicant
    .map(a => (a.status as string) === 'Start Date Requested' ? { ...a, status: 'Date Change Requested' as Application['status'] } : a);
}
function loadApps(): Application[] {
  try {
    const ver = localStorage.getItem(APP_VER_KEY);
    const raw = localStorage.getItem(APP_KEY);
    if (ver === APP_SEED_VER && raw) return JSON.parse(raw) as Application[];
    // Merge: add new seed records without wiping existing test data
    const existing: Application[] = raw ? JSON.parse(raw) : [];
    const seed = seedData as Application[];
    const ids = new Set(existing.map((a: Application) => a.id));
    const merged = [...existing, ...seed.filter((a: Application) => !ids.has(a.id))];
    localStorage.setItem(APP_KEY, JSON.stringify(merged));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
    return merged;
  } catch { return seedData as Application[]; }
}

const PIPELINE_STATUSES = new Set<ApplicationStatus>([
  'Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed',
]);
const SHORTLISTED_ONWARDS = new Set<ApplicationStatus>([
  'Shortlisted for Interview', 'Interview Scheduled', 'Interview Completed',
  'Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed',
]);
const EVAL_ONWARDS = new Set<ApplicationStatus>([
  'Interview Completed', 'Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed',
]);
const OFFER_ONWARDS = new Set<ApplicationStatus>([
  'Offer Extended', 'Offer Accepted', 'Active Intern', 'Internship Completed',
]);

/* ════════════════════════════════════════════════════════════════════════════
   Engagement (CRM lead-score) model — faithful port of the design handoff's
   engagement.js. Treats the candidate as a "lead" whose warmth is driven by
   how often & how recently they've engaged with DSTA (their touchpoints:
   applications + DSTA engagements). Recency-decayed weighted sum → 0–100 →
   a temperature tier → a recommended comms cadence. Advisory for outreach,
   never a hiring criterion.
   ════════════════════════════════════════════════════════════════════════════ */
const ENG_WEIGHTS: Record<string, number> = {
  scholarship: 46, internship: 40, competition: 20, 'techup-course': 15,
  application: 13, 'techup-event': 9, programme: 9, outreach: 4, other: 6,
};
const ENG_LABEL: Record<string, string> = {
  scholarship: 'Scholarship', internship: 'Internship', competition: 'Competition',
  'techup-course': 'TechUp course', application: 'Application', 'techup-event': 'TechUp event',
  programme: 'Programme', outreach: 'Outreach', other: 'Engagement',
};
interface EngTier { key: string; label: string; min: number; cls: string; dot: string; stroke: string; blurb: string; action: string; cadence: string }
const ENG_TIERS: EngTier[] = [
  { key: 'champion', label: 'Champion', min: 78, cls: 'bg-success-bg text-success', dot: 'bg-success', stroke: 'stroke-success',
    blurb: 'A loyal repeat engager — your warmest talent. Keep close.',
    action: 'Priority outreach', cadence: 'Personal follow-up + VIP eDM track' },
  { key: 'hot', label: 'Hot', min: 55, cls: 'bg-accent/10 text-accent', dot: 'bg-accent', stroke: 'stroke-accent',
    blurb: 'Highly engaged across multiple touchpoints. Strong nurture candidate.',
    action: 'Add to nurture campaign', cadence: 'Monthly targeted eDMs' },
  { key: 'warm', label: 'Warm', min: 28, cls: 'bg-warning-bg text-warning', dot: 'bg-warning', stroke: 'stroke-warning',
    blurb: 'Some engagement — worth nurturing toward a deeper touchpoint.',
    action: 'Send re-engagement eDM', cadence: 'Quarterly eDMs + event invites' },
  { key: 'cold', label: 'Cold', min: 0, cls: 'bg-bg-muted text-fg-muted', dot: 'bg-fg-subtle', stroke: 'stroke-fg-subtle',
    blurb: 'First or one-off contact. Welcome them and watch for activity.',
    action: 'Send welcome eDM', cadence: 'Onboarding sequence only' },
];
function engRecencyFactor(year: number, nowYear: number): number {
  const age = Math.max(0, nowYear - year);
  const ladder = [1, 0.8, 0.62, 0.48, 0.36];
  return ladder[age] != null ? ladder[age] : 0.28;
}
interface EngagementResult {
  value: number; tier: EngTier; touchpoints: number; channels: number;
  isRepeat: boolean; topDriver: { kind: string; label: string; year: number } | null;
}
function scoreEngagement(items: { kind: string; year: number }[], nowYear: number): EngagementResult | null {
  if (!items.length) return null;
  let raw = 0;
  const channels = new Set<string>();
  const contributions: { kind: string; label: string; year: number; points: number }[] = [];
  items.forEach(it => {
    const base = ENG_WEIGHTS[it.kind] ?? 6;
    const pts = base * engRecencyFactor(it.year, nowYear);
    raw += pts;
    channels.add(it.kind);
    contributions.push({ kind: it.kind, label: ENG_LABEL[it.kind] ?? it.kind, year: it.year, points: pts });
  });
  raw += Math.max(0, channels.size - 1) * 6; // breadth bonus
  const value = Math.max(0, Math.min(100, Math.round(raw)));
  const tier = ENG_TIERS.find(t => value >= t.min) ?? ENG_TIERS[ENG_TIERS.length - 1];
  contributions.sort((a, b) => b.points - a.points);
  return {
    value, tier, touchpoints: items.length, channels: channels.size,
    isRepeat: items.length >= 3, topDriver: contributions[0] ?? null,
  };
}

/* ── Soft profile — the human side. Real fields where present (achievements,
   tech-domain interests, mentor notes/evaluation); deterministically mocked
   off app.id where the Application type has no field (blurb, working-style,
   what-they're-looking-for). Clearly synthetic, stable per candidate. ──────── */
const INTEREST_POOL = ['Competitive programming', 'Robotics', 'Open-source', 'Hackathons', 'Cybersecurity CTFs', 'Embedded electronics', 'ML side-projects', 'Game development', 'Astronomy', 'Volunteer tutoring', 'Trail running', 'Music production', 'Drone photography', 'Chess'];
const LOOKING_POOL = ['A mentor who reviews work closely', 'Ownership of a real feature', 'To see how DSTA ships to operations', 'Hard problems with real stakes', 'To turn theory into practice', 'A team that welcomes questions'];
const STYLE_POOL = ['Methodical', 'Curious', 'Fast iterator', 'Detail-oriented', 'Collaborative', 'Documents as they go', 'Calm under pressure', 'Self-directed'];

function seedOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* Given (personal) name from a full name. Singaporean names are mixed-order:
   Chinese names are surname-FIRST ("Lim Jun Hao" → given "Jun Hao"), while Western/
   Malay/Indian names are given-first ("Priya Nair" → "Priya"). We detect the common
   Chinese-surname-first case via a surname list; otherwise we take the first token.
   Used wherever we address the candidate personally (AI copy, prompts, dialogs). */
const CN_SURNAMES = new Set([
  'Tan','Lim','Lee','Ng','Wong','Goh','Ong','Teo','Chua','Koh','Sim','Chan','Cheng','Chen',
  'Wang','Zhang','Liu','Yeo','Toh','Heng','Low','Loh','Foo','Phua','Quek','Seah','Tay','Chong',
  'Chia','Ho','Ang','Yap','Chew','Lau','Soh','Tham','Mok','Pang','Neo','Khoo','Gan','Han','Leong',
  'Liang','Lin','Lai','Kang','Kwan','Kwok','Fong','Hong','Tong','Wee','Yong','Yuen','Wu','Xu',
  'Sun','Huang','Guo','Cai','Deng','Feng','Peng','Shen','Song','Xie','Yang','Ye','Zheng','Zhu',
]);
function givenNameOf(full: string): string {
  const parts = (full ?? '').trim().split(/\s+/);
  if (parts.length >= 2 && CN_SURNAMES.has(parts[0])) return parts.slice(1).join(' '); // surname-first
  return parts[0] ?? '';
}

/* Strip the legacy "(within … track)" jargon from any cached/seed reasoning string so
   the per-row copy stays clean ("Academic standing: Top."); the methodology is explained
   once beneath the fit list instead of repeated (and unclearly) on every row. */
function cleanReasoning(text: string): string {
  return (text ?? '').replace(/ \(within [^()]*(?:\([^()]*\)[^()]*)*\)(?=\.)/g, '');
}
interface SoftProfile {
  blurb: string;
  interests: string[];
  style: string[];
  looking: string[];
  mentorNote: { text: string; by: string; role: string } | null;
}
function buildSoftProfile(app: Application): SoftProfile {
  const first = givenNameOf(app.name);
  const field = app.course.replace(/ ·.*/, '');
  const h = seedOf(app.id || app.name);
  const pick = (arr: string[], n: number, off = 0): string[] => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(arr[(h + off + i * 7) % arr.length]);
    return Array.from(new Set(out));
  };
  // Real interest signal from the application's tech-domain field, if present.
  const td = app.formValues?.tech_domain;
  const domainInterests = (Array.isArray(td) ? td : td ? [td] : []) as string[];
  const interests = domainInterests.length ? domainInterests : pick(INTEREST_POOL, 5);
  const blurb = `${first} is drawn to ${field || 'their field'}${app.previousDSTA ? ', and has kept coming back to DSTA' : ''} — looking to turn coursework into something that ships and holds up when it matters.`;
  // Real mentor note from interview notes / post-internship strengths where present.
  let mentorNote: SoftProfile['mentorNote'] = null;
  if (app.mentorNotes && app.mentorNotes.trim()) {
    mentorNote = { text: app.mentorNotes.trim(), by: 'Interview panel', role: 'Mentor' };
  } else if (app.mentorEvaluation?.strengths) {
    mentorNote = { text: app.mentorEvaluation.strengths, by: 'Mentor', role: 'Post-internship' };
  }
  return { blurb, interests, style: pick(STYLE_POOL, 3, 5), looking: pick(LOOKING_POOL, 3, 3), mentorNote };
}

/* ── AI summary copy (advisory, sourced) derived from the real application. ── */
function buildAiNarrative(app: Application, topFit: { title: string; fit: number } | null): string {
  const first = givenNameOf(app.name);
  if (app.status === 'Auto-rejected' || !app.eligibilityPass) {
    const why = app.failedCriteria[0]?.replace(/\s*\((Mandatory|Preferred)\)\s*$/, '') ?? 'programme criteria not met';
    return `${first} does not currently meet the programme criteria — ${why.toLowerCase()}. No further screening is recommended this cycle.`;
  }
  const fit = topFit ? topFit.fit : 0;
  const grade = fit >= 90 ? 'a very strong' : fit >= 80 ? 'a strong' : fit >= 70 ? 'a solid' : 'a developing';
  const head = topFit
    ? `${first} looks like ${grade} match for ${topFit.title}. `
    : `${first} has a complete application awaiting a project match. `;
  const trail = EVAL_ONWARDS.has(app.status)
    ? 'Interview feedback is on file and supports a decision.'
    : SHORTLISTED_ONWARDS.has(app.status)
      ? 'Cleared eligibility and has been shortlisted.'
      : 'Application is complete and awaiting screening.';
  return `${head}${app.course.replace(/ ·.*/, '')} at ${app.school}${app.gpa > 0 ? ` with a GPA of ${app.gpa.toFixed(2)}` : ''}. ${trail}`;
}

/* ── Advisory recommendation verdict (put-forward / hold) from top fit. ────── */
function recommendVerdict(eligible: boolean, topFit: number): { label: string; cls: string } {
  if (!eligible) return { label: 'Not recommended', cls: 'bg-danger-bg text-danger' };
  if (topFit >= 88) return { label: 'Strong recommend', cls: 'bg-success-bg text-success' };
  if (topFit >= 78) return { label: 'Recommend', cls: 'bg-accent/10 text-accent-hover' };
  if (topFit >= 68) return { label: 'Consider', cls: 'bg-warning-bg text-warning' };
  return { label: 'Hold', cls: 'bg-bg-muted text-fg-muted' };
}

/* ── Disclosure — collapsible section with aria-expanded button + optional
   count chip / verdict badge. Mirrors the design handoff's C3Disclosure. ───── */
function Disclosure({ title, count, badge, badgeCls, defaultOpen, children }: {
  title: string;
  count?: number;
  badge?: string;
  badgeCls?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
      <h2 className="m-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-bg-subtle/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <span className="inline-flex items-center gap-2.5 text-body-md font-semibold text-fg">
          {title}
          {count != null && (
            <span className="text-body-sm font-bold text-fg-muted bg-bg-muted rounded-full px-2 py-px">{count}</span>
          )}
        </span>
        <span className="inline-flex items-center gap-2.5 shrink-0">
          {badge && <span className={cn('text-body-sm font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap', badgeCls)}>{badge}</span>}
          <ChevronDown size={15} className={cn('text-fg-muted transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      </h2>
      {open && <div className="px-5 pb-5 pt-1 border-t border-border">{children}</div>}
    </section>
  );
}

/* ── AI summary card — sparkle badge + refresh (working skeleton, aria-live),
   bold lead sentence, icon bullets, Show-more factor bars, Ask-AI reprompt. ── */
function AiSummaryPanel({ app, narrative, touchpoints, years, topFit, engagement, messages, loading, onAsk }: {
  app: Application;
  narrative: string;
  touchpoints: number;
  years: number;
  topFit: { title: string; fit: number } | null;
  engagement: EngagementResult | null;
  messages: { role: 'user' | 'assistant'; content: string }[];
  loading: boolean;
  onAsk: (q: string) => void;
}) {
  const [working, setWorking] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askVal, setAskVal] = useState('');
  const [isMac, setIsMac] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const [showFacts, setShowFacts] = useState(false); // supporting facts collapsed by default → shorter card
  const [spinKey, setSpinKey] = useState(0); // bump to replay the animated border (mount + refresh)
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')); }, []);
  const first = givenNameOf(app.name);
  function rate(i: number, v: 'up' | 'down') {
    setFeedback(f => {
      const next = { ...f };
      if (next[i] === v) delete next[i]; else next[i] = v;
      return next;
    });
  }
  function refresh() {
    if (working) return;
    setWorking(true);
    setSpinKey(k => k + 1); // replay the emphasis border while regenerating
    setTimeout(() => setWorking(false), 1100); // brief "working" state, never blank
  }
  function submitAsk() {
    const v = askVal.trim();
    if (!v) return;
    setAskOpen(false);
    setAskVal('');
    onAsk(v);
  }
  // Supporting facts — like the reference, the first 2 show always under the lead and the
  // rest sit behind a "Show more" toggle (keeps the card short without hiding everything).
  const facts = [
    engagement && (
      <li key="eng"><strong className="font-semibold text-fg">{engagement.touchpoints} DSTA touchpoint{engagement.touchpoints === 1 ? '' : 's'} over {years} year{years === 1 ? '' : 's'}</strong> — {engagement.tier.label.toLowerCase()} engagement.</li>
    ),
    topFit && (
      <li key="fit"><strong className="font-semibold text-fg">Best fit: {topFit.title}</strong> — {topFit.fit}% on discipline, skills &amp; standing.</li>
    ),
    <li key="course"><strong className="font-semibold text-fg">{app.course}</strong> at {app.school}{app.gpa > 0 ? ` · GPA ${app.gpa.toFixed(2)}` : ''}.</li>,
  ].filter(Boolean);
  // Default view = the narrative overview only; ALL supporting facts sit behind "Show more".
  const shownFacts = showFacts ? facts : [];
  const hasMoreFacts = facts.length > 0;
  return (
    <section className="relative rounded-xl border border-accent/30 bg-[rgb(var(--color-accent-subtle))] p-5 shadow-[0_0_0_3px_rgb(var(--color-accent)/0.07)]">
      <span key={spinKey} aria-hidden="true" className="ai-anim-border" />
      <h2 className="m-0 mb-2.5 inline-flex items-center gap-2.5 text-body-md font-semibold text-fg">
        <AiSparkleIcon size={15} className="shrink-0" />AI summary
      </h2>
      <p className="mb-3 flex items-center gap-2 text-body-sm text-fg-muted">
        <span>Updated just now · generated from {touchpoints} touchpoint{touchpoints === 1 ? '' : 's'}</span>
        <button
          onClick={refresh}
          disabled={working}
          aria-label="Refresh summary"
          title="Refresh summary"
          className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-accent hover:bg-accent/10 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <RefreshCw size={13} className={cn('shrink-0', working && 'animate-spin')} />
        </button>
      </p>

      {working ? (
        <div aria-live="polite" className="flex flex-col gap-2.5 py-1">
          <span className="h-3 rounded-full bg-accent/15 animate-pulse" style={{ width: '94%' }} />
          <span className="h-3 rounded-full bg-accent/15 animate-pulse" style={{ width: '86%' }} />
          <span className="h-3 rounded-full bg-accent/15 animate-pulse" style={{ width: '70%' }} />
        </div>
      ) : (
        <>
          <p className="text-body-md font-bold text-fg leading-relaxed">{narrative}</p>
          {/* Overview (narrative) only by default; supporting facts revealed via "Show more". */}
          {shownFacts.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1.5 text-body-sm text-fg-muted leading-snug">
              {shownFacts}
            </ul>
          )}
          {hasMoreFacts && (
            <button
              onClick={() => setShowFacts(s => !s)}
              aria-expanded={showFacts}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border bg-surface text-body-sm font-semibold text-accent hover:bg-accent/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {showFacts ? 'Show less' : 'Show more'}
              <ChevronDown size={13} className={cn('transition-transform', showFacts && 'rotate-180')} />
            </button>
          )}

          {/* Conversation thread — Ask-AI answers render inline here. */}
          {messages.length > 0 && (
            <div className="mt-3.5 flex flex-col gap-4 border-t border-accent/15 pt-3.5" aria-live="polite">
              {messages.map((m, i) => (
                m.role === 'user' ? (
                  <div key={i} className="flex flex-col items-end gap-1 self-end max-w-[88%]">
                    <span className="text-caption font-bold uppercase tracking-widest text-accent">You asked</span>
                    <p className="rounded-xl rounded-tr-sm bg-accent px-3 py-2 text-body-sm font-semibold text-accent-fg leading-snug">{m.content}</p>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <AiSparkleIcon size={15} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {m.content ? (
                        <>
                          <p className="text-body-sm text-fg leading-relaxed whitespace-pre-wrap">{m.content}</p>
                          {/* Sources — what the answer was grounded in. */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-caption font-semibold text-fg-subtle">Sources</span>
                            {['Application form', 'Academic transcript'].map(s => (
                              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-caption font-medium text-fg-muted">
                                <FileText size={11} className="shrink-0" />{s}
                              </span>
                            ))}
                          </div>
                          {/* Helpful? feedback */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-caption font-semibold text-fg-subtle">Helpful?</span>
                            <button
                              onClick={() => rate(i, 'up')}
                              aria-pressed={feedback[i] === 'up'}
                              aria-label="Helpful"
                              className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold transition-colors',
                                feedback[i] === 'up' ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-fg-muted hover:text-accent hover:border-accent')}
                            >
                              <ThumbsUp size={12} className="shrink-0" />Yes
                            </button>
                            <button
                              onClick={() => rate(i, 'down')}
                              aria-pressed={feedback[i] === 'down'}
                              aria-label="Not helpful"
                              className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold transition-colors',
                                feedback[i] === 'down' ? 'border-danger bg-danger/10 text-danger' : 'border-border bg-surface text-fg-muted hover:text-danger hover:border-danger')}
                            >
                              <ThumbsDown size={12} className="shrink-0" />No
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-body-sm text-fg-muted leading-snug">{loading && i === messages.length - 1 ? 'Thinking…' : ''}</p>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {/* Single horizontal-scroll row (per ref) — keeps the card short instead of wrapping.
              Right-edge mask fades the last chip so there's an obvious "more →" affordance. */}
          <div
            className="mt-3.5 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', maskImage: 'linear-gradient(to right, #000 86%, transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 86%, transparent)' }}
          >
            <button
              onClick={() => setAskOpen(o => !o)}
              aria-expanded={askOpen}
              className={cn('inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-body-md font-semibold text-accent border border-accent/25 transition-shadow',
                askOpen ? 'ring-1 ring-inset ring-accent/40' : 'hover:border-accent/45')}
              style={{ background: 'linear-gradient(90deg, rgb(var(--toa-blue) / 0.07), rgb(var(--toa-teal) / 0.09))' }}
            >
              <AiSparkleIcon size={13} className="shrink-0" />Ask AI
            </button>
            {[`Why is ${first} a strong match?`, 'Any interview feedback?', 'What are the risks?'].map(q => (
              <button
                key={q}
                onClick={() => { setAskVal(q); setAskOpen(true); }}
                className="shrink-0 px-3 py-1.5 rounded-full border border-border-strong bg-surface text-body-md font-semibold text-fg-muted hover:text-accent hover:border-accent transition-colors whitespace-nowrap"
              >{q}</button>
            ))}
          </div>

          {askOpen && (
            <div className="mt-2.5 rounded-xl border border-accent/30 bg-accent/[0.05] p-2.5">
              <textarea
                value={askVal}
                onChange={e => setAskVal(e.target.value)}
                rows={2}
                autoFocus
                placeholder={`Ask about ${first} — e.g. how do their skills compare, or what should we probe in the interview?`}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAsk(); }}
                className="w-full resize-y min-h-[44px] rounded-lg border border-border bg-surface px-2.5 py-2 text-body-sm text-fg leading-snug focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <div className="flex items-center justify-between gap-2 mt-2">
                <span className="text-body-sm text-fg-muted font-semibold">{isMac ? '⌘↵' : 'Ctrl+↵'} to send</span>
                <div className="flex gap-2">
                  <button onClick={submitAsk} disabled={!askVal.trim()} className="px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-body-md font-bold disabled:opacity-50">Send</button>
                  <button onClick={() => { setAskOpen(false); setAskVal(''); }} className="px-3 py-1.5 rounded-lg border border-border bg-surface text-body-md font-semibold text-fg-muted">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <p className="mt-3.5 pt-3 border-t border-accent/15 flex items-start gap-1.5 text-body-sm text-fg-muted leading-snug">
        <Info size={12} className="mt-0.5 shrink-0" />
        AI-generated from {first}&apos;s full DSTA journey — may be incomplete or inaccurate. Verify against source records.
      </p>
    </section>
  );
}

/* ── DSTA Journey timeline — year-grouped touchpoints (applications + DSTA
   engagements), each with an icon, category tag, details and a CTA. Shows the
   2 most-recent year groups with a "show full journey" toggle. ─────────────── */
const JOURNEY_KIND_META: Record<string, { label: string; icon: React.ElementType; dot: string; cta: string }> = {
  application:     { label: 'Application',   icon: FileText,      dot: 'bg-accent/10 text-accent',   cta: 'Open application' },
  internship:      { label: 'Internship',    icon: GraduationCap, dot: 'bg-success-bg text-success', cta: 'View internship' },
  'techup-course': { label: 'TechUp course', icon: ClipboardList, dot: 'bg-accent/10 text-accent',   cta: 'View record' },
  'techup-event':  { label: 'TechUp event',  icon: CalendarDays,  dot: 'bg-accent/10 text-accent',   cta: 'View feedback' },
  competition:     { label: 'Competition',   icon: Trophy,        dot: 'bg-warning-bg text-warning', cta: 'View result' },
  scholarship:     { label: 'Scholarship',   icon: Award,         dot: 'bg-success-bg text-success', cta: 'View record' },
  programme:       { label: 'Programme',     icon: Folder,        dot: 'bg-accent/10 text-accent',   cta: 'View programme' },
  other:           { label: 'Engagement',    icon: History,       dot: 'bg-bg-muted text-fg-muted',  cta: 'View details' },
};

function C360JourneyTimeline({ history, engagements, projects, weights, onOpenApp, onToast }: {
  history: Application[];
  engagements?: DSTAEngagementEntry[];
  projects: ProjectEntry[];
  weights: ScoringWeights;
  onOpenApp: (id: string) => void;
  onToast: (m: string) => void;
}) {
  const [all, setAll] = useState(false);

  type Item = { year: number; kind: string; title: string; details: string; appId?: string };
  const items: Item[] = [
    ...history.map((h): Item => {
      const placed = h.shortlistedFor ? projects.find(p => p.id === h.shortlistedFor) : null;
      const topSuit = [...(h.suitabilityScores ?? [])].map(s => ({ t: s.projectTitle, r: reweightScore(s, weights) })).sort((a, b) => b.r - a.r)[0];
      const focus = placed?.title ?? topSuit?.t ?? 'project match';
      return { year: new Date(h.appliedDate).getFullYear(), kind: 'application', title: `${h.programmeName} — applied`, details: `${focus} · ${STATUS_META[h.status]?.label ?? h.status}`, appId: h.id };
    }),
    ...(engagements ?? []).map((e): Item => ({ year: e.year, kind: e.kind ?? 'other', title: e.title, details: e.details ?? '' })),
  ].sort((a, b) => b.year - a.year);

  // Collapsed by default to just the latest 2 touchpoints (keeps the screen short);
  // "Show full journey" reveals the rest. Group the visible items by year for display.
  const RECENT = 2;
  const visibleItems = all ? items : items.slice(0, RECENT);
  const byYear = new Map<number, Item[]>();
  visibleItems.forEach(it => { const g = byYear.get(it.year) ?? []; g.push(it); byYear.set(it.year, g); });
  const shown = Array.from(byYear.entries()).map(([year, its]) => ({ year, items: its }));
  const hiddenCount = items.length - visibleItems.length;

  if (items.length === 0) return <p className="text-body-sm text-fg-muted italic">No touchpoints with DSTA on record yet.</p>;

  return (
    <div className="mt-1">
      {/* Custom PRIZM-styled vertical timeline — icon node beside a touchpoint card,
          no rail. Chronology = year headers + most-recent-first order. */}
      {shown.map((g) => (
        <div key={g.year}>
          <div className="flex items-center gap-3 my-3">
            <span className="text-body-sm font-bold text-fg-muted tabular-nums">{g.year}</span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <div className="flex flex-col gap-4">
            {g.items.map((it, ii) => {
              const meta = JOURNEY_KIND_META[it.kind] ?? JOURNEY_KIND_META.other;
              const Icon = meta.icon;
              return (
                <div key={ii} className="flex items-start gap-3.5">
                  <span className={cn('grid place-items-center w-9 h-9 rounded-full shrink-0', meta.dot)}>
                    <Icon size={15} />
                  </span>
                  <div className="flex-1 rounded-xl border border-border bg-surface shadow-sm px-4 py-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-body-sm font-bold text-fg">{it.title}</span>
                      <span className="text-caption font-bold uppercase tracking-wide text-fg-muted whitespace-nowrap">{meta.label}</span>
                    </div>
                    {it.details && <p className="text-body-sm text-fg-muted mt-1 leading-snug">{it.details}</p>}
                    <button
                      onClick={() => it.appId ? onOpenApp(it.appId) : onToast(`${meta.cta} — ${it.title}`)}
                      aria-label={`${meta.cta}: ${it.title} (${g.year})`}
                      className="mt-2 inline-flex items-center gap-1 rounded-md border border-border-strong bg-surface px-2.5 py-1 text-body-sm font-semibold text-accent hover:bg-accent/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {meta.cta}<ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {items.length > RECENT && (
        <button
          onClick={() => setAll(a => !a)}
          aria-expanded={all}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-bg-subtle text-body-md font-semibold text-accent hover:bg-bg-muted transition-colors"
        >
          {all ? 'Show less' : `Show full journey · ${hiddenCount} earlier touchpoint${hiddenCount === 1 ? '' : 's'}`}
          <ChevronDown size={13} className={cn('transition-transform', all && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}

/* ── Status config ────────────────────────────────────────────────────────── */
const STATUS_META: Record<ApplicationStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  'Pending Screening':        { label: 'Pending Screening',   cls: 'bg-warning-bg text-warning border-warning/30',  icon: <Clock size={11} /> },
  'Pending Review':           { label: 'Pending Review',      cls: 'bg-warning-bg text-warning border-warning/30',  icon: <Clock size={11} /> },
  'Auto-rejected':            { label: 'Auto-rejected',       cls: 'bg-danger-bg  text-danger  border-danger/30',   icon: <XCircle size={11} /> },
  'Shortlisted for Interview':{ label: 'Shortlisted',         cls: 'bg-success-bg text-success border-success/30',  icon: <CheckCircle2 size={11} /> },
  'Interview Scheduled':      { label: 'Interview Scheduled', cls: 'bg-accent/10  text-accent-hover  border-accent/30',   icon: <CalendarDays size={11} /> },
  'Interview Completed':      { label: 'Interview Completed', cls: 'bg-accent/10  text-accent-hover  border-accent/30',   icon: <UserCheck size={11} /> },
  'Offer Extended':           { label: 'Offer Extended',        cls: 'bg-success-bg text-success border-success/30',  icon: <CheckCircle2 size={11} /> },
  'Offer Accepted':           { label: 'Offer Accepted',        cls: 'bg-success-bg text-success border-success/30',  icon: <CheckCircle2 size={11} /> },
  'Offer Declined':           { label: 'Offer Declined',        cls: 'bg-danger-bg  text-danger  border-danger/30',   icon: <XCircle size={11} /> },
  'Date Change Requested':     { label: 'Date Change Requested', cls: 'bg-warning-bg text-warning border-warning/30',  icon: <Clock size={11} /> },
  'Active Intern':            { label: 'Active Intern',         cls: 'bg-success-bg text-success border-success/30',  icon: <CheckCircle2 size={11} /> },
  'Internship Completed':     { label: 'Completed',             cls: 'bg-bg-muted   text-fg-muted border-border',     icon: <CheckCircle2 size={11} /> },
  'Withdrawn':                { label: 'Withdrawn',             cls: 'bg-danger-bg  text-danger  border-danger/30',   icon: <XCircle size={11} /> },
  'Terminated':               { label: 'Terminated',            cls: 'bg-danger-bg  text-danger  border-danger/30',   icon: <UserX   size={11} /> },
  'Accepted':                 { label: 'Accepted',              cls: 'bg-success-bg text-success border-success/30',  icon: <CheckCircle2 size={11} /> },
  'Rejected':                 { label: 'Rejected',              cls: 'bg-danger-bg  text-danger  border-danger/30',   icon: <UserX   size={11} /> },
};

/* ── Sub-components ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: ApplicationStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cn('inline-flex items-center gap-1 text-body-sm font-bold px-2.5 py-0.5 rounded-full border', m.cls)}>
      {m.icon}{m.label}
    </span>
  );
}

/* ── Lifecycle spine (README §4): Applied → Eligible → Shortlisted → Interview → Offer → Onboarded ── */
const LIFECYCLE_STAGES = ['Applied', 'Eligible', 'Shortlisted', 'Interview', 'Offer', 'Onboarded'] as const;

function lifecyclePosition(status: ApplicationStatus): { idx: number; halted: boolean; complete: boolean } {
  switch (status) {
    case 'Pending Screening':
    case 'Pending Review':            return { idx: 1, halted: false, complete: false };
    case 'Auto-rejected':             return { idx: 1, halted: true,  complete: false };
    case 'Shortlisted for Interview': return { idx: 2, halted: false, complete: false };
    case 'Rejected':                  return { idx: 2, halted: true,  complete: false };
    case 'Interview Scheduled':
    case 'Interview Completed':
    case 'Accepted':                  return { idx: 3, halted: false, complete: false };
    case 'Offer Extended':
    case 'Offer Accepted':
    case 'Date Change Requested':     return { idx: 4, halted: false, complete: false };
    case 'Offer Declined':            return { idx: 4, halted: true,  complete: false };
    case 'Active Intern':             return { idx: 5, halted: false, complete: false };
    case 'Internship Completed':      return { idx: 5, halted: false, complete: true  };
    case 'Withdrawn':
    case 'Terminated':                return { idx: 5, halted: true,  complete: false };
    default:                          return { idx: 0, halted: false, complete: false };
  }
}

function LifecycleSpine({ app, confirmedSlotData, touchpoints }: {
  app: Application;
  confirmedSlotData: { date: string; time: string } | null;
  touchpoints: number;
}) {
  const { idx, halted, complete } = lifecyclePosition(app.status);
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : undefined);
  const stageDate = (i: number): string | undefined => {
    if (i === 0) return fmt(app.appliedDate);
    if (i === 3) return fmt(confirmedSlotData?.date);
    if (i === 5) return fmt(app.internshipStartDate);
    return undefined;
  };
  return (
    <section aria-label="Application lifecycle" className="card px-5 py-4 mb-5">
      <ol className="flex items-start">
        {LIFECYCLE_STAGES.map((label, i) => {
          const done       = i < idx || (complete && i === idx);
          const current    = i === idx && !complete && !halted;
          const haltedHere = halted && i === idx;
          const date       = stageDate(i);
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span aria-hidden="true" className={cn('absolute top-3 left-[-50%] right-1/2 h-0.5', i <= idx ? 'bg-accent' : 'bg-border')} />
              )}
              <span className={cn(
                'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                haltedHere ? 'bg-danger border-danger text-danger-fg'
                  : done    ? 'bg-accent border-accent text-accent-fg'
                  : current ? 'bg-surface border-accent text-accent'
                  : 'bg-surface border-border text-fg-subtle',
              )}>
                {haltedHere ? <XCircle size={13} /> : done ? <Check size={13} /> : current ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
              </span>
              <span className={cn('mt-1.5 text-body-sm font-semibold leading-tight',
                haltedHere ? 'text-danger' : current ? 'text-accent' : done ? 'text-fg' : 'text-fg-subtle')}>
                {label}
              </span>
              {date && <span className="mt-0.5 text-caption text-fg-muted tabular-nums">{date}</span>}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-body-sm text-fg-muted">
        <History size={12} className="text-fg-subtle" />
        Applied {fmt(app.appliedDate)} · {touchpoints} DSTA touchpoint{touchpoints === 1 ? '' : 's'}
      </div>
    </section>
  );
}

interface ScoreBreakdown {
  course:            string;
  projectDiscipline: string;
  projectSkills:     string[];
  disciplineScore:   number;
  skillsScore:       number;
  weights:           ScoringWeights;
}

function ScoreBreakdownPopover({ breakdown, pos, onClose }: { breakdown: ScoreBreakdown; pos: { top: number; left: number; badgeTop: number }; onClose: () => void }) {
  const { course, projectDiscipline, projectSkills, disciplineScore, skillsScore, weights } = breakdown;
  const { matched } = calcSkillsScore(course, projectSkills);
  const matchedSet = new Set(matched.map(s => s.toLowerCase()));
  const divRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [adjustedTop, setAdjustedTop] = useState(pos.top);

  useEffect(() => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom > vh - 8) {
      setAdjustedTop(Math.max(8, pos.badgeTop - rect.height - 6));
    }
    setVisible(true);
  }, []);

  const discTier =
    disciplineScore >= 85 ? { label: 'Strong match',  color: 'text-success' } :
    disciplineScore >= 68 ? { label: 'Good match',    color: 'text-accent'  } :
    disciplineScore >= 42 ? { label: 'Partial match', color: 'text-warning' } :
                            { label: 'Weak match',    color: 'text-danger'  };
  const totalScore = Math.min(99, Math.max(1, Math.round(
    (weights.discipline / 100) * disciplineScore + (weights.skills / 100) * skillsScore
  )));
  const badgeCls = totalScore >= 85 ? 'bg-success-bg text-success border-success/20' :
    totalScore >= 70 ? 'bg-accent/10 text-accent border-accent/20' :
    totalScore >= 55 ? 'bg-warning-bg text-warning border-warning/20' : 'bg-danger-bg text-danger border-danger/20';
  return (
    <div
      ref={divRef}
      onMouseLeave={onClose}
      style={{ position: 'fixed', top: adjustedTop, left: pos.left, zIndex: 9999, width: 272, opacity: visible ? 1 : 0, transition: 'opacity 0.08s' }}
      className="bg-surface border border-border rounded-xl shadow-xl p-4 pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-label-sm font-bold text-fg">Score Breakdown</p>
        <span className={cn('text-body-md font-bold px-2 py-0.5 rounded-lg border', badgeCls)}>{totalScore}</span>
      </div>
      <div className="mb-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle">Discipline · {weights.discipline}%</span>
          <span className="text-body-md font-bold text-fg">{disciplineScore}</span>
        </div>
        <p className="text-body-sm text-fg">{course || '—'}</p>
        {projectDiscipline && <p className="text-body-md text-fg-muted mt-0.5">Required: {projectDiscipline}</p>}
        <span className={cn('text-body-md font-semibold mt-1 inline-block', discTier.color)}>{discTier.label}</span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle">Skills · {weights.skills}%</span>
          <span className="text-body-md font-bold text-fg">{skillsScore}</span>
        </div>
        {projectSkills.length === 0 ? (
          <p className="text-body-md text-fg-muted">No specific skills required.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {projectSkills.map(skill => {
              const sl  = skill.toLowerCase();
              const hit = matchedSet.has(sl) || matched.some(m => sl.includes(m) || m.includes(sl));
              return (
                <span key={skill} className={cn(
                  'inline-flex items-center gap-1 text-body-sm font-semibold px-2 py-0.5 rounded-full border',
                  hit ? 'bg-success-bg text-success border-success/20' : 'bg-bg-subtle text-fg-muted border-border'
                )}>{hit ? '✓' : '✗'} {skill}</span>
              );
            })}
          </div>
        )}
        <p className="text-body-sm text-fg-subtle mt-2 leading-snug">Assessed from applicant&apos;s course of study and application materials.</p>
      </div>
    </div>
  );
}

function ScoreBadge({ score, breakdown }: { score: number; breakdown?: ScoreBreakdown }) {
  const cls = score >= 80 ? 'bg-success-bg text-success' : score >= 60 ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger';
  const ref = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number; badgeTop: number } | null>(null);
  function onEnter() {
    if (!breakdown || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - 272, window.innerWidth - 272 - 8));
    setTip({ top: r.bottom + 6, left, badgeTop: r.top });
  }
  return (
    <>
      <span ref={ref} onMouseEnter={onEnter} onMouseLeave={() => setTip(null)}
        className={cn('text-body-md font-bold px-2 py-0.5 rounded-full shrink-0 cursor-default', cls, breakdown && 'cursor-help')}
      >{score}%</span>
      {typeof window !== 'undefined' && tip && breakdown && createPortal(
        <ScoreBreakdownPopover breakdown={breakdown} pos={tip} onClose={() => setTip(null)} />,
        document.body
      )}
    </>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-body-sm text-fg-muted">{label}</span>
        <span className="text-body-sm font-semibold text-fg">{value.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-subtle overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('bg-surface border border-border rounded-lg shadow-sm p-5', className)}>
      {children}
    </section>
  );
}

function CollapsibleCard({ icon: Icon, title, children, className, defaultOpen = true }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn('bg-surface border border-border rounded-lg shadow-sm overflow-hidden', className)}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 hover:bg-bg-subtle/40 transition-colors"
      >
        <Icon size={14} className="text-accent shrink-0" />
        <span className="text-body-md font-semibold text-fg flex-1 text-left">{title}</span>
        <ChevronDown size={13} className={cn('text-fg-muted shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} className="text-accent shrink-0" />
      <h2 className="text-body-md font-semibold text-fg">{title}</h2>
    </div>
  );
}

function OverlineLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-2">{children}</p>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-body-sm text-fg-subtle shrink-0">{label}</span>
      <span className="text-body-sm text-fg font-medium text-right">{value}</span>
    </div>
  );
}

/* Resolves the rejection email template name for a given app stage.
   ET-002 → Auto-rejected (eligibility fail)
   ET-003 → IO manual reject before interview
   ET-004 → IO confirms mentor rejection after interview */
function getRejectionTemplateName(app: Application, isPostInterview: boolean): string {
  try {
    const raw = localStorage.getItem('dsta_email_templates');
    const templates: { id: string; name: string }[] = raw ? JSON.parse(raw) : [];
    const id = app.status === 'Auto-rejected'
      ? 'ET-002'
      : isPostInterview
        ? 'ET-004'
        : 'ET-003';
    return templates.find(t => t.id === id)?.name ?? (id === 'ET-002' ? 'Ineligibility Notification' : id === 'ET-004' ? 'Post-Interview Rejection' : 'Pre-Interview Rejection');
  } catch {
    return 'Rejection Notification';
  }
}

function DSTAEngagementList({ engagements }: { engagements?: DSTAEngagementEntry[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (!engagements || engagements.length === 0) {
    return <p className="text-body-sm text-fg-muted italic">No prior DSTA engagement on record.</p>;
  }

  function toggle(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  return (
    <div className="divide-y divide-border">
      {engagements.map((e, i) => (
        <div key={i} className="py-3 first:pt-0 last:pb-0">
          <button
            onClick={() => e.details && toggle(i)}
            className={cn('w-full flex items-center gap-3 text-left', e.details ? 'cursor-pointer group' : 'cursor-default')}
          >
            <span className="text-body-md font-bold text-fg-subtle w-10 shrink-0">{e.year}</span>
            <span className="text-body-sm font-medium text-fg flex-1">{e.title}</span>
            {e.details && (
              <ChevronDown size={13} className={cn('text-fg-muted shrink-0 transition-transform', expanded.has(i) && 'rotate-180')} />
            )}
          </button>
          {e.details && expanded.has(i) && (
            <p className="mt-2 ml-[52px] text-body-sm text-fg-muted leading-relaxed">{e.details}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── DSTA engagement — grouped by kind ─────────────────────────────────────── */
const ENGAGEMENT_KIND_META: Record<DSTAEngagementKind, { label: string; icon: typeof Briefcase }> = {
  internship:      { label: 'Internships',      icon: Briefcase },
  'techup-course': { label: 'TechUp courses',   icon: GraduationCap },
  'techup-event':  { label: 'TechUp & events',  icon: CalendarDays },
  programme:       { label: 'Programmes',       icon: Award },
  scholarship:     { label: 'Scholarships',     icon: Award },
  competition:     { label: 'Competitions',     icon: Star },
  other:           { label: 'Other engagement', icon: FileText },
};
const ENGAGEMENT_ORDER: DSTAEngagementKind[] = ['internship', 'techup-course', 'techup-event', 'programme', 'scholarship', 'competition', 'other'];

function GroupedEngagements({ engagements }: { engagements?: DSTAEngagementEntry[] }) {
  if (!engagements || engagements.length === 0) {
    return <p className="text-body-sm text-fg-muted italic">No prior DSTA engagement on record.</p>;
  }
  return (
    <div className="space-y-3.5">
      {ENGAGEMENT_ORDER.map(kind => {
        const items = engagements.filter(e => (e.kind ?? 'other') === kind).sort((a, b) => b.year - a.year);
        if (items.length === 0) return null;
        const meta = ENGAGEMENT_KIND_META[kind];
        const Icon = meta.icon;
        return (
          <div key={kind}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={12} className="text-accent shrink-0" />
              <p className="text-body-sm font-bold uppercase tracking-wider text-fg-subtle">{meta.label}</p>
              <span className="text-caption font-bold text-fg-muted bg-bg-subtle rounded-full px-1.5">{items.length}</span>
            </div>
            <ul className="space-y-1.5 pl-[18px]">
              {items.map((e, i) => (
                <li key={i} className="flex items-baseline gap-2" title={e.details ?? ''}>
                  <span className="text-body-sm text-fg-subtle tabular-nums w-9 shrink-0">{e.year}</span>
                  <span className="text-body-sm text-fg leading-snug">{e.title}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ── AI recommendation + best-fit card (README §4) ─────────────────────────── */
function VerdictPill({ score }: { score: number }) {
  const v = score >= 75 ? { label: 'Strong fit',   cls: 'bg-success-bg text-success border-success/30' }
    :       score >= 55 ? { label: 'Moderate fit', cls: 'bg-accent/10  text-accent-hover  border-accent/30'  }
    :                      { label: 'Limited fit',  cls: 'bg-warning-bg text-warning border-warning/30' };
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-body-sm font-semibold', v.cls)}>{v.label}</span>;
}

function SubScore({ label, value }: { label: string; value?: number }) {
  const v = value ?? 0;
  // Compact chip (matches the prototype) — not a bar chart.
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-bg-subtle px-2 py-0.5 text-caption text-fg-muted">
      {label}<span className="font-semibold text-fg tabular-nums">{v}</span>
    </span>
  );
}

/* Normalise the three raw 0–100 weight sliders into display shares that always
   total exactly 100% (largest-remainder rounding — avoids 42+42+17=101 drift). */
function weightShares(w: ScoringWeights): { discipline: number; skills: number; standing: number } {
  const parts: [keyof ScoringWeights, number][] = [
    ['discipline', w.discipline], ['skills', w.skills], ['standing', w.standing],
  ];
  const total = parts.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return { discipline: 0, skills: 0, standing: 0 };
  const rows = parts.map(([k, v]) => { const exact = (v / total) * 100; return { k, base: Math.floor(exact), rem: exact - Math.floor(exact) }; });
  let leftover = 100 - rows.reduce((sum, r) => sum + r.base, 0);
  rows.sort((a, b) => b.rem - a.rem).forEach((r, i) => { (r as { extra?: number }).extra = i < leftover ? 1 : 0; });
  const out = { discipline: 0, skills: 0, standing: 0 };
  rows.forEach(r => { out[r.k as 'discipline' | 'skills' | 'standing'] = r.base + ((r as { extra?: number }).extra ?? 0); });
  return out;
}

/* Weighting factors as an accent colour-ramp — reads as "parts of one whole"
   without implying status semantics (green=good etc.). */
const WEIGHT_FACTORS = [
  { key: 'discipline', label: 'Discipline', fill: 'bg-accent',    lit: 'bg-accent',    swatch: 'bg-accent'    },
  { key: 'skills',     label: 'Skills',     fill: 'bg-accent/65', lit: 'bg-accent/80', swatch: 'bg-accent/65' },
  { key: 'standing',   label: 'Standing',   fill: 'bg-accent/25', lit: 'bg-accent/45', swatch: 'bg-accent/25' },
] as const;

/* Single 100% allocation bar: three segments sized by their share, with two
   draggable dividers that trade between adjacent factors. The shares ARE the
   percentages and always total 100, so segment width === printed % (no post-hoc
   normalisation, no thumb≠label drift). Pointer-drag + keyboard (←/→ ±1, ⇧ ±10). */
function WeightAllocator({ weights, onChange }: { weights: ScoringWeights; onChange: (w: ScoringWeights) => void }) {
  const s = weightShares(weights);
  const vals = [s.discipline, s.skills, s.standing];
  const bounds = [vals[0], vals[0] + vals[1]];          // cumulative divider positions
  const barRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  // Divider hovered/focused (or dragging) → reinforce by brightening the two
  // segments it trades between. Reinforcement only (handle position + aria-valuetext
  // already convey it); fires on hover AND focus (keyboard parity); brightens the
  // active pair rather than dimming the rest into illegibility.
  const [hot, setHot] = useState<number | null>(null);
  const activeDiv = drag ?? hot;
  const litSeg = (idx: number) => activeDiv === 0 ? idx <= 1 : activeDiv === 1 ? idx >= 1 : false;

  const setBoundary = useCallback((i: number, posPct: number) => {
    const c = weightShares(weights);
    if (i === 0) {
      const d = Math.round(Math.min(c.discipline + c.skills, Math.max(0, posPct)));
      onChange({ discipline: d, skills: c.discipline + c.skills - d, standing: c.standing });
    } else {
      const b = Math.round(Math.min(100, Math.max(c.discipline, posPct)));
      onChange({ discipline: c.discipline, skills: b - c.discipline, standing: 100 - b });
    }
  }, [weights, onChange]);

  useEffect(() => {
    if (drag == null) return;
    const move = (e: PointerEvent) => {
      const el = barRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      setBoundary(drag, ((e.clientX - r.left) / r.width) * 100);
    };
    const up = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag, setBoundary]);

  const onKey = (i: number) => (e: React.KeyboardEvent) => {
    const d = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setBoundary(i, bounds[i] - d); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setBoundary(i, bounds[i] + d); }
  };

  return (
    <div>
      {/* Bar is pure proportion — % values live in the legend (high-contrast fg),
          so no text sits on the light ramp steps (avoids the WCAG contrast trap). */}
      <div ref={barRef} role="group" aria-label="Score weighting allocation"
        className="relative flex h-9 w-full select-none overflow-hidden rounded-lg border border-border">
        {WEIGHT_FACTORS.map((f, idx) => (
          <div key={f.key} aria-hidden
            className={cn('h-full', litSeg(idx) ? f.lit : f.fill,
              drag == null ? 'transition-[width,background-color] duration-150' : 'transition-none')}
            style={{ width: `${vals[idx]}%` }} />
        ))}
        {bounds.map((b, i) => (
          <div key={i} role="slider" tabIndex={0}
            aria-label={i === 0 ? 'Discipline / Skills weighting' : 'Skills / Standing weighting'}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(b)}
            aria-valuetext={i === 0 ? `Discipline ${vals[0]}%, Skills ${vals[1]}%` : `Skills ${vals[1]}%, Standing ${vals[2]}%`}
            onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); setDrag(i); }}
            onKeyDown={onKey(i)}
            onMouseEnter={() => setHot(i)}
            onMouseLeave={() => setHot(null)}
            onFocus={() => setHot(i)}
            onBlur={() => setHot(null)}
            className="group absolute top-0 z-10 flex h-full w-6 -translate-x-1/2 cursor-grab items-center justify-center focus-visible:outline-none active:cursor-grabbing"
            style={{ left: `${b}%` }}>
            {/* PRIZM slider-thumb language: raised white handle, accent border,
                shadow + accent ring that grows on hover/focus, grip glyph. */}
            <span className="flex h-6 w-3.5 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent shadow-sm ring-0 ring-accent/20 transition-[box-shadow,background-color,color] duration-150 group-hover:ring-4 group-focus-visible:ring-4 group-focus-visible:ring-accent/35 group-active:bg-accent group-active:text-accent-fg group-active:ring-4 group-active:ring-accent/35">
              <GripVertical size={11} className="shrink-0 -mx-1" />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {WEIGHT_FACTORS.map((f, idx) => (
          <span key={f.key} className="inline-flex items-center gap-1.5 text-body-sm font-medium text-fg-muted">
            <span className={cn('h-2.5 w-2.5 rounded-[3px]', f.swatch)} aria-hidden />{f.label}
            <span className="font-bold tabular-nums text-fg">{vals[idx]}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({ app, projects, weights, onWeights, putForward, onToggleRecommend }: {
  app: Application;
  projects: ProjectEntry[];
  weights: ScoringWeights;
  onWeights: (w: ScoringWeights) => void;
  putForward: string[];
  onToggleRecommend: (projectId: string) => void;
}) {
  const [showWeights, setShowWeights] = useState(false);
  const ranked = [...(app.suitabilityScores ?? [])]
    .map(s => ({ s, fit: reweightScore(s, weights) }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 5);
  const top     = ranked[0]?.fit ?? 0;
  const titleOf = (pid: string, fallback: string) => projects.find(p => p.id === pid)?.title ?? fallback;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <AiSparkleIcon size={15} className="shrink-0" />
        <h2 className="text-body-md font-semibold text-fg">AI recommendation</h2>
        {ranked.length > 0 && <VerdictPill score={top} />}
        <button
          onClick={() => setShowWeights(v => !v)}
          aria-expanded={showWeights}
          className="ml-auto inline-flex items-center gap-1 text-body-sm font-medium text-fg-muted transition-colors hover:text-accent"
        >
          <SlidersHorizontal size={13} />Adjust weighting
        </button>
      </div>

      {showWeights && (
        <div className="mb-4 space-y-2.5 rounded-xl border border-border bg-bg-subtle p-3">
          <p className="text-body-sm text-fg-muted">Tune how discipline, skills and academic standing weigh into the fit score — drag a divider to trade between two factors. Re-ranks live, saved for your session.</p>
          <WeightAllocator weights={weights} onChange={onWeights} />
        </div>
      )}

      <p className="mb-2 text-body-sm font-bold uppercase tracking-widest text-fg-subtle">Best-fit projects to put forward</p>
      {ranked.length === 0 ? (
        <p className="text-body-sm text-fg-muted">No suitability scores on record for this candidate yet.</p>
      ) : (
        <ol className="space-y-2">
          {ranked.map(({ s, fit }, i) => {
            const rec = putForward.includes(s.projectId);
            return (
              <li key={s.projectId} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 w-4 shrink-0 text-body-sm font-bold tabular-nums text-fg-subtle">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-fg">{titleOf(s.projectId, s.projectTitle)}</p>
                      <span className="shrink-0 text-body-sm font-bold tabular-nums text-accent">{fit}%</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <SubScore label="Discipline" value={s.disciplineScore} />
                      <SubScore label="Skills"     value={s.skillsScore} />
                      {s.standingScore != null
                        ? <SubScore label="Standing" value={s.standingScore} />
                        : <div className="text-caption text-fg-subtle self-center">Standing n/a</div>}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleRecommend(s.projectId)}
                    aria-pressed={rec}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-body-sm font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      rec ? 'border-accent bg-accent text-accent-fg' : 'border-border text-fg-muted hover:border-accent hover:text-accent',
                    )}
                  >
                    {rec ? <><Check size={13} />Recommended</> : <><Star size={13} />Recommend</>}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {putForward.length > 0 && (
        <p className="mt-3 text-body-sm text-fg-muted">{putForward.length} project{putForward.length === 1 ? '' : 's'} put forward for this candidate.</p>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-body-sm text-fg-subtle">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
        AI assists — fit scores are advisory; the decision stays with you.
      </p>
    </Card>
  );
}

/* ── IM8 masked particulars + access log (README §4, pts 6–7) ──────────────────
   Data-minimisation: the cleartext is produced ONLY inside each `reveal()` thunk,
   on click — it is never stored on the Particular or passed as a prop while masked,
   so masked values aren't resident in the component tree/memory. Masks are fixed
   placeholders (they don't embed the real value). NOTE: these particulars are
   synthetic sample data for the prototype (derived from the application id). */
interface Particular { label: string; mask: string; reveal: () => string }

/* Least-privilege: only personnel-handling officers may reveal protected particulars.
   Mentors (who assess) and applicants do not get the reveal control. */
const CAN_REVEAL_PII = new Set<UserRole>(['io-admin', 'io', 'ad-pnc', 'director']);
/* Preset reasons-for-access logged with each reveal (IM8 purpose limitation). */
const REVEAL_REASONS = [
  'Verifying eligibility / identity',
  'Preparing interview or offer',
  'Contacting the candidate',
  'Other',
];

function candidateParticulars(app: Application): Particular[] {
  const seed = app.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return [
    { label: 'NRIC/FIN',      mask: 'S•••••••',     reveal: () => `S${String(1000000 + (seed * 7919) % 8999999)}${'ABCDEFGHJZ'[seed % 10]}` },
    { label: 'Date of birth', mask: '••/••/••••',   reveal: () => `${String(1 + (seed % 28)).padStart(2, '0')}/${String(1 + (seed % 12)).padStart(2, '0')}/${2006 - (app.year ?? 1)}` },
    { label: 'Mobile',        mask: '+65 •••• ••••', reveal: () => `+65 9${String(100 + (seed % 900))} ${String(1000 + (seed % 9000))}` },
    { label: 'Email',         mask: '••••••@•••',    reveal: () => app.email ?? '—' },
  ];
}

function ProtectedField({ p, canReveal, onRequestReveal }: { p: Particular; canReveal: boolean; onRequestReveal: (label: string, doReveal: () => void) => void }) {
  // Cleartext only exists in state after an explicit reveal; masked → null in memory.
  const [shown, setShown] = useState<string | null>(null);
  const revealed = shown !== null;
  function handleClick() {
    if (revealed) { setShown(null); return; }                 // hide → drop from memory
    if (!canReveal) return;
    onRequestReveal(p.label, () => setShown(p.reveal()));      // gated: parent collects reason first
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <span className="shrink-0 text-body-sm text-fg-muted">{p.label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('truncate text-body-sm font-medium tabular-nums', revealed ? 'text-fg' : 'tracking-wider text-fg-subtle')}>
          {revealed ? shown : p.mask}
        </span>
        {canReveal || revealed ? (
          <button
            onClick={handleClick}
            aria-label={revealed ? `Hide ${p.label}` : `Reveal ${p.label}`}
            aria-pressed={revealed}
            className="shrink-0 rounded-md p-1 text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        ) : (
          <span className="shrink-0 p-1 text-fg-subtle" title="Revealing particulars is restricted to internship & personnel officers" aria-label="Reveal restricted for your role">
            <Lock size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

function ProtectedParticularsCard({ app, role, onReveal }: { app: Application; role: UserRole; onReveal: (label: string, reason: string) => void }) {
  const items = candidateParticulars(app);
  const canReveal = CAN_REVEAL_PII.has(role);
  // Reveal flow: clicking the eye opens a reason-for-access prompt; on confirm we run the
  // field's reveal callback and log the reason (IM8 purpose limitation + access logging).
  const [pending, setPending] = useState<{ label: string; doReveal: () => void } | null>(null);
  const [reason, setReason]   = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const effectiveReason = reason === 'Other' ? reasonOther.trim() : reason;
  function confirmReveal() {
    if (!pending || !effectiveReason) return;
    pending.doReveal();
    onReveal(pending.label, effectiveReason);
    setPending(null); setReason(''); setReasonOther('');
  }
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2 flex-wrap">
        <ShieldCheck size={15} className="shrink-0 text-accent" />
        <h3 className="text-body-md font-semibold text-fg">Personal particulars</h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-subtle px-2 py-0.5 text-caption font-semibold text-fg-muted">
          <Lock size={10} />Protected
        </span>
        <span className="ml-auto inline-flex items-center rounded-full border border-warning/30 bg-warning-bg px-2 py-0.5 text-caption font-semibold text-warning">Sample data</span>
      </div>
      <p className="mb-2 text-body-sm text-fg-muted">
        Masked under IM8 — cleartext is shown only when you reveal a field, you must give a reason, and each reveal is written to the access log. Particulars here are synthetic sample data for this prototype.
        {!canReveal && <span className="mt-1 flex items-center gap-1.5 text-warning"><Lock size={11} className="shrink-0" />Revealing particulars is restricted to internship &amp; personnel officers — your role can view masked values only.</span>}
      </p>
      <div>{items.map(p => <ProtectedField key={p.label} p={p} canReveal={canReveal} onRequestReveal={(label, doReveal) => { setReason(''); setReasonOther(''); setPending({ label, doReveal }); }} />)}</div>

      <Modal open={!!pending} onClose={() => setPending(null)} labelledBy="reveal-reason-title">
        <h2 id="reveal-reason-title" className="text-body-md font-bold text-fg">Reason for revealing {pending?.label}</h2>
        <p className="mt-1 text-body-sm text-fg-muted">State why you need to see this protected particular. Your name, the field and this reason are written to the access log (IM8).</p>
        <div className="mt-3 flex flex-col gap-2">
          {REVEAL_REASONS.map(r => (
            <label key={r} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 cursor-pointer hover:bg-bg-subtle has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input type="radio" name="reveal-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-[rgb(var(--color-accent))]" />
              <span className="text-body-sm text-fg">{r}</span>
            </label>
          ))}
          {reason === 'Other' && (
            <input
              type="text" autoFocus value={reasonOther} onChange={e => setReasonOther(e.target.value)}
              placeholder="Specify the reason"
              aria-label="Specify the reason for access"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-body-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={confirmReveal} disabled={!effectiveReason}><Eye size={14} />Reveal &amp; log</Button>
          <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
        </div>
      </Modal>
    </Card>
  );
}

function AccessLogCard({ entries }: { entries: AccessLogEntry[] }) {
  // Collapse runs of the identical action by the same actor (e.g. repeated
  // "Opened Candidate 360") into one row with a count + the most-recent time.
  type Row = AccessLogEntry & { count: number };
  const rows: Row[] = [];
  for (const e of entries.slice(0, 40)) {
    const last = rows[rows.length - 1];
    if (last && last.detail === e.detail && last.actor === e.actor && last.action === e.action) {
      last.count += 1;
    } else {
      rows.push({ ...e, count: 1 });
    }
  }
  const fmt = (ts: number) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-body-md font-semibold text-fg">Access log</h3>
        <span className="ml-auto text-body-sm text-fg-subtle">{entries.length} event{entries.length === 1 ? '' : 's'}</span>
      </div>
      <p className="mb-3 text-body-sm text-fg-muted">Audit trail of record access and reveals (IM8).</p>
      {entries.length === 0 ? (
        <p className="text-body-sm text-fg-muted">No access recorded yet.</p>
      ) : (
        <ol className="-mx-1.5">
          {rows.map((e, i) => {
            const RowIcon = e.action === 'reveal' ? Eye : e.action === 'decision' ? ClipboardList : History;
            const tone = e.action === 'reveal' ? 'bg-warning-bg text-warning' : e.action === 'decision' ? 'bg-success-bg text-success' : 'bg-accent/10 text-accent';
            return (
              <li key={i} className="flex items-center gap-3 rounded-lg px-1.5 py-1.5">
                <span className={cn('grid place-items-center w-7 h-7 rounded-full shrink-0', tone)}>
                  <RowIcon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm text-fg leading-snug">
                    {e.detail}
                    {e.count > 1 && <span className="ml-1.5 text-caption font-semibold text-fg-muted tabular-nums">×{e.count}</span>}
                  </p>
                  <p className="text-caption text-fg-muted">{e.actor}</p>
                </div>
                <span className="text-caption tabular-nums text-fg-subtle shrink-0">{fmt(e.ts)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ── Programme-fit ranked list ─────────────────────────────────────────────────
   A live leaderboard: cards re-rank as the weighting changes. Kept deliberately
   quiet (à la Uxcel / Duolingo leaderboards) so the motion reads without clutter:
     • one muted rank number in a left gutter — the anchor that makes the list read
       as a *ranking*, so a reorder means "the ranking updated", not "things jumped";
     • fit% sits with its action on the right; the project title is the only bold thing;
     • a brief, subtle highlight on rows whose rank just changed replaces per-row
       delta chips — it shows *what* moved with no extra numbers (honours
       prefers-reduced-motion via transition, which the global CSS neutralises);
     • a polite aria-live line announces the new top fit for screen-reader users.
   The FLIP travel itself lives in useFlipReorder. */
type FitItem = { s: Application['suitabilityScores'][number]; fit: number };

function FitRankedList({ items, putForward, viewApp, projects, onToggle }: {
  items: FitItem[];
  putForward: string[];
  viewApp: Application;
  projects: ProjectEntry[];
  onToggle: (projectId: string) => void;
}) {
  const flipRef = useFlipReorder();
  const prevRanks = useRef<Map<string, number>>(new Map());
  const [moved, setMoved] = useState<Set<string>>(new Set());
  const [liveMsg, setLiveMsg] = useState('');
  const [showAll, setShowAll] = useState(false);
  const orderKey = items.map(r => r.s.projectId).join('|');
  // Cap to the top matches by default so a long tail (~21 projects) doesn't force a
  // long page scroll — the recruiter acts on the strongest fits first.
  const CAP = 5;
  const visible = showAll ? items : items.slice(0, CAP);

  useEffect(() => {
    const next = new Map<string, number>();
    items.forEach((r, i) => next.set(r.s.projectId, i));
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevRanks.current.size) {
      const changed = new Set<string>();
      next.forEach((rank, pid) => {
        const prev = prevRanks.current.get(pid);
        if (prev != null && prev !== rank) changed.add(pid);
      });
      if (changed.size) {
        setMoved(changed);
        const topTitle = projects.find(p => p.id === items[0]?.s.projectId)?.title ?? items[0]?.s.projectTitle ?? '';
        setLiveMsg(`List re-ranked. Best fit now ${topTitle}.`);
        timer = setTimeout(() => setMoved(new Set()), 1100);
      }
    }
    prevRanks.current = next;
    return () => { if (timer) clearTimeout(timer); };
  }, [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">{liveMsg}</p>
      <ol className="flex flex-col gap-2">
        {visible.map(({ s, fit }, i) => {
          const rec = putForward.includes(s.projectId);
          const proj = projects.find(p => p.id === s.projectId);
          const isCurrent = viewApp.shortlistedFor === s.projectId;
          const isTopPref = viewApp.projectRankings?.[0] === s.projectId;
          const isMoved = moved.has(s.projectId);
          return (
            <li
              key={s.projectId}
              ref={flipRef(s.projectId)}
              className={cn('flex items-start gap-3 rounded-xl border p-3 transition-colors duration-700',
                rec ? 'border-success bg-success-bg/40' : isMoved ? 'border-accent/40 bg-accent/[0.05]' : 'border-border')}
            >
              <span className="w-5 shrink-0 pt-0.5 text-center text-body-sm font-semibold tabular-nums text-fg-subtle">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="flex items-center gap-2 flex-wrap text-body-sm font-bold text-fg">
                  {proj?.title ?? s.projectTitle}
                  {isCurrent && <span className="text-caption font-bold text-accent bg-accent/10 px-2 py-px rounded-full">Current</span>}
                  {isTopPref && <span className="text-caption font-bold text-accent bg-accent/10 px-2 py-px rounded-full">Their #1</span>}
                </p>
                <p className="text-body-sm text-fg-muted mt-0.5 leading-snug">{cleanReasoning(s.reasoning)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SubScore label="Discipline" value={s.disciplineScore} />
                  <SubScore label="Skills"     value={s.skillsScore} />
                  {s.standingScore != null
                    ? <SubScore label="Standing" value={s.standingScore} />
                    : <span className="inline-flex items-center rounded-md bg-bg-subtle px-2 py-0.5 text-caption text-fg-subtle">Standing n/a</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-between self-stretch gap-2 pt-0.5">
                <span className="text-lg font-extrabold leading-none tabular-nums text-accent">{fit}<span className="text-caption font-bold">%</span></span>
                <button
                  onClick={() => onToggle(s.projectId)}
                  aria-pressed={rec}
                  className={cn('inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-body-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    rec ? 'border-success bg-success-bg text-success' : 'border-border-strong text-fg-muted hover:border-accent hover:text-accent')}
                >
                  {rec ? <><CheckCircle2 size={13} />Recommended</> : 'Recommend'}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      {items.length > CAP && (
        <button
          onClick={() => setShowAll(v => !v)}
          aria-expanded={showAll}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-bg-subtle text-body-sm font-semibold text-accent hover:bg-bg-muted transition-colors"
        >
          {showAll ? `Show top ${CAP}` : `Show all ${items.length} projects`}
          <ChevronDown size={13} className={cn('transition-transform', showAll && 'rotate-180')} />
        </button>
      )}
    </>
  );
}

/* ── Engagement gauge ──────────────────────────────────────────────────────────
   Static ring (no draw-in) — renders at its final value immediately. */
function EngagementGauge({ value, tier }: { value: number; tier: EngTier }) {
  const C = 188.5; // 2πr, r = 30
  const off = C - (value / 100) * C;
  return (
    <div className="relative w-[72px] h-[72px] shrink-0 grid place-items-center">
      <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true" className="relative">
        <circle cx="36" cy="36" r="30" fill="none" className="stroke-border" strokeWidth="8" />
        <circle
          cx="36" cy="36" r="30" fill="none" className={tier.stroke} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className="absolute text-xl font-extrabold text-fg tabular-nums">{value}</span>
    </div>
  );
}

/* Beyond the résumé — quote + interests always shown; working style & goals are
   progressively disclosed so the card stays short (keeps more above the fold). */
function BeyondResumeCard({ soft, first }: { soft: SoftProfile; first: string }) {
  const [more, setMore] = useState(false);
  const hasMore = soft.style.length > 0 || soft.looking.length > 0;
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-body-md font-semibold text-fg">Beyond the résumé</h2>
        <span className="ml-auto text-body-sm text-fg-muted">Captured across touchpoints</span>
      </div>
      <blockquote className="text-body-md italic text-fg leading-relaxed border-l-[3px] border-accent pl-3.5 mb-2.5">{soft.blurb}</blockquote>
      <p className="text-body-sm font-semibold text-fg-muted">From {first}&apos;s application</p>
      {soft.mentorNote && (
        <div className="relative mt-3 mb-1 rounded-xl border border-bg-muted bg-bg-subtle px-3.5 py-3">
          <p className="text-body-sm italic text-fg-muted leading-relaxed line-clamp-5">&ldquo;{soft.mentorNote.text}&rdquo;</p>
          <p className="mt-2 text-body-sm font-semibold text-fg-muted">{soft.mentorNote.by} · {soft.mentorNote.role}</p>
        </div>
      )}
      {soft.interests.length > 0 && (
        <>
          <p className="mt-4 text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-2">Interests</p>
          <div className="flex flex-wrap gap-2">
            {soft.interests.map((t, i) => <span key={i} className="text-body-md font-semibold text-fg-muted bg-bg-muted px-3 py-1 rounded-full">{t}</span>)}
          </div>
        </>
      )}
      {more && (
        <>
          {soft.style.length > 0 && (
            <>
              <p className="mt-4 text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-2">Working style</p>
              <div className="flex flex-wrap gap-2">
                {soft.style.map((t, i) => <span key={i} className="text-body-md font-semibold text-fg-muted bg-bg-muted px-3 py-1 rounded-full">{t}</span>)}
              </div>
            </>
          )}
          {soft.looking.length > 0 && (
            <>
              <p className="mt-4 text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-2">What they&apos;re looking for</p>
              <ul className="flex flex-col gap-2.5">
                {soft.looking.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-body-sm text-fg leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-[7px]" />{t}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {hasMore && (
        <button
          onClick={() => setMore(m => !m)}
          aria-expanded={more}
          className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-bg-subtle text-body-sm font-semibold text-accent hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {more ? 'Show less' : 'Show working style & goals'}
          <ChevronDown size={13} className={cn('transition-transform', more && 'rotate-180')} />
        </button>
      )}
    </Card>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Candidate360() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const id           = params?.id as string;
  const fromParam      = searchParams?.get('from') ?? '';
  const fromMentor     = fromParam === 'mentor';
  const fromInterns    = fromParam === 'interns';
  const fromInterviews = fromParam === 'interviews';
  const fromShortlist  = fromParam === 'shortlist';
  const fromProjects   = fromParam === 'projects';
  const fromProjId     = searchParams?.get('proj') ?? '';
  const autoEval     = searchParams?.get('eval') === '1';
  const { toast, showToast } = useToast();
  const { role, profile } = useRole();
  const { aiSummary: aiSummaryOn } = useSystemConfig(); // Admin → System config feature switch
  // Access log attributes actions to the named officer (IM8 non-repudiation), not just the role.
  const actorName = `${profile.name} (${profile.title})`;
  /* Write a screening decision (reject / interview outcome / offer / recommend) to the
     IM8 access log, attributed to the named officer, and refresh the displayed log. */
  const recordDecision = (detail: string, subjectId: string) => {
    logAccess({ actor: actorName, action: 'decision', detail, subjectId });
    setAccessLog(getAccessLog(subjectId));
  };

  const [apps,           setApps]           = useState<Application[]>([]);
  const [projects,       setProjects]       = useState<ProjectEntry[]>([]);
  const [weights,        setWeights]        = useState<ScoringWeights>({ discipline: 50, skills: 30, standing: 20 });
  const [putForward,     setPutForward]     = useState<string[]>([]);
  const [accessLog,      setAccessLog]      = useState<AccessLogEntry[]>([]);
  const loggedViews = useRef<Set<string>>(new Set());
  const [dstaEngagements, setDstaEngagements] = useState<DSTAEngagementEntry[] | undefined>(undefined);

  /* IO action state */
  const [localMentorDecision, setLocalMentorDecision] = useState<Application['mentorDecision']>(null);
  const [rejectModal,         setRejectModal]         = useState<{ onConfirm: (remark: string) => void; isPostInterview: boolean } | null>(null);
  const [rejectRemark,        setRejectRemark]        = useState('');
  const [overrideOpen,        setOverrideOpen]        = useState(false);
  const [overrideReason,      setOverrideReason]      = useState('');
  const [acceptConfirmOpen,   setAcceptConfirmOpen]   = useState(false);
  const [dateChangeOpen,      setDateChangeOpen]      = useState(false);
  const [dateChangeNote,      setDateChangeNote]      = useState('');

  /* Mentor action state */
  const [scheduleOpen,      setScheduleOpen]      = useState(false);
  const [rescheduleOpen,    setRescheduleOpen]    = useState(false);
  const [markCompleteOpen,  setMarkCompleteOpen]  = useState(false);

  /* Application selector + tab state */
  const [selectedViewAppId, setSelectedViewAppId] = useState<string | null>(null);
  const [viewTab,           setViewTab]           = useState<'overview' | 'interview' | 'feedback'>('overview');

  /* Ask-AI state — rendered inline in the AI summary card (no floating FAB). */
  type ChatMsg = { role: 'user' | 'assistant'; content: string };
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading,  setChatLoading]  = useState(false);

  useEffect(() => {
    setApps(loadApps());
    setProjects(loadProjects());
    setWeights(loadWeights());
  }, []);

  /* Put-forward (IO recommendations) — persisted per candidate. */
  const pfAppId = selectedViewAppId ?? id;
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('dsta_putforward') ?? '{}') as Record<string, string[]>;
      setPutForward(all[pfAppId] ?? []);
    } catch { setPutForward([]); }
  }, [pfAppId]);

  /* Log a record-open once per candidate, then surface the access log (IM8). */
  useEffect(() => {
    if (!apps.length || !apps.some(a => a.id === pfAppId)) return;
    if (!loggedViews.current.has(pfAppId)) {
      loggedViews.current.add(pfAppId);
      logAccess({ actor: actorName, action: 'view', detail: 'Opened Candidate 360', subjectId: pfAppId });
    }
    setAccessLog(getAccessLog(pfAppId));
  }, [pfAppId, apps.length, role]);

  /* Backfill missing suitability-score components (discipline/skills/standing) from
     the matching projects so the weighting slider actually re-ranks — many seed
     records only carry the precomputed `score`. Recomputed for display only. */
  const scoredApps = useMemo(
    () => (projects.length ? apps.map(a => backfillScoreComponents(a, projects)) : apps),
    [apps, projects],
  );

  const app     = scoredApps.find(a => a.id === id);

  useEffect(() => {
    if (app?.email) setDstaEngagements(getEngagements(app.email));
  }, [app?.email]);

  /* sync localMentorDecision when app loads */
  const history = app ? scoredApps.filter(a => a.email === app.email) : [];

  useEffect(() => {
    if (app?.mentorDecision !== undefined) setLocalMentorDecision(app.mentorDecision ?? null);
  }, [app?.id]);

  /* auto-redirect to evaluation page when navigated here with ?eval=1 */
  useEffect(() => {
    if (autoEval && app?.id && app?.status === 'Interview Completed') router.push(`/mentor/interviews/${app.id}`);
  }, [app?.id, autoEval]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Actions ──────────────────────────────────────────────────────────── */
  function saveApp(updated: Application) {
    const next = apps.map(a => a.id === updated.id ? updated : a);
    setApps(next);
    localStorage.setItem(APP_KEY, JSON.stringify(next));
    localStorage.setItem(APP_VER_KEY, APP_SEED_VER);
  }

  function openRejectModal(onConfirm: (remark: string) => void, isPostInterview = false) {
    setRejectRemark('');
    setRejectModal({ onConfirm, isPostInterview });
  }

  function doReject(remark: string) {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    saveApp({ ...app, status: 'Rejected', ioRejectionRemark: remark, rejectionEmailSent: true, rejectionEmailSentDate: today });
    recordDecision(`Rejected application — ${remark}`, app.id);
    showToast(`${app.name} rejected. Notification sent to ${app.email}.`);
    addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Update on your application', body: `We regret to inform you that your application to ${app.programmeName} was unsuccessful.`, href: '/apply/applications', tier: 'info' });
  }

  // Grey-case eligibility override (TOA-070): IO discretion to keep an applicant who
  // failed screening (e.g. narrowly-missed GPA + strong achievements). Required reason,
  // audited; returns them to the review pool.
  function doOverrideEligibility(reason: string) {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    saveApp({ ...app, eligibilityPass: true, status: 'Pending Review', eligibilityOverride: { by: actorName, reason, date: today } });
    recordDecision(`Eligibility override (grey-case) — reason: ${reason}`, app.id);
    showToast(`Eligibility overridden — ${givenNameOf(app.name)} returned to review.`);
  }

  // Security clearance (TOA-143): a parallel track the IO can start after shortlist,
  // independent of the interview/offer pipeline. Audited.
  function doInitiateClearance() {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    saveApp({ ...app, securityClearance: { status: 'in-progress', startedDate: today } });
    recordDecision('Security clearance initiated', app.id);
    showToast(`Security clearance started for ${givenNameOf(app.name)}.`);
  }
  function doCompleteClearance() {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    saveApp({ ...app, securityClearance: { status: 'completed', startedDate: app.securityClearance?.startedDate ?? today, completedDate: today } });
    recordDecision('Security clearance completed', app.id);
    showToast(`Security clearance completed for ${givenNameOf(app.name)}.`);
  }

  function doRecordMentorDecision(d: 'Accepted' | 'Rejected', remark?: string) {
    if (!app) return;
    const today = new Date().toISOString().split('T')[0];
    setLocalMentorDecision(d);
    saveApp({
      ...app,
      mentorDecision: d,
      ...(remark ? { ioRejectionRemark: remark } : {}),
      ...(d === 'Rejected' ? { rejectionEmailSent: true, rejectionEmailSentDate: today } : {}),
    });
    recordDecision(`Interview outcome: ${d}${remark ? ` — ${remark}` : ''}`, app.id);
    if (d === 'Rejected') {
      showToast(`${app.name} rejected. Notification sent to ${app.email}.`);
      addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Update on your application', body: `We regret to inform you that your application to ${app.programmeName} was unsuccessful.`, href: '/apply/applications', tier: 'info' });
    }
  }

  // Rematch after a failed/declined interview (TOA-090/124): move the candidate to
  // their next untried ranked preference instead of rejecting them outright. No
  // rejection email — they re-enter the interview pipeline for the new project.
  function doRematch(nextId: string) {
    if (!app) return;
    const tried = Array.from(new Set([...(app.triedProjects ?? []), ...(app.shortlistedFor ? [app.shortlistedFor] : [])]));
    const fromTitle = projects.find(p => p.id === app.shortlistedFor)?.title ?? app.shortlistedFor ?? 'previous project';
    const toProj    = projects.find(p => p.id === nextId);
    const toTitle   = toProj?.title ?? nextId;
    setLocalMentorDecision(null);
    saveApp({
      ...app,
      shortlistedFor: nextId,
      status: 'Shortlisted for Interview',
      triedProjects: tried,
      projectArchived: undefined,
      mentorDecision: null, mentorNotes: undefined, mentorScores: undefined,
      mentorRejectionRemark: undefined, mentorAiSummary: undefined, mentorTranscript: undefined,
      interviewSlots: undefined, confirmedSlot: undefined, meetingLink: undefined, rescheduleNote: undefined,
      rejectionEmailSent: undefined, rejectionEmailSentDate: undefined,
    });
    recordDecision(`Rematched to next preference "${toTitle}" (did not proceed on "${fromTitle}")`, app.id);
    showToast(`${givenNameOf(app.name)} rematched to ${toTitle}.`);
    addNotification({
      forRole: 'mentor',
      ...(toProj?.mentorUserId ? { forMentorId: toProj.mentorUserId } : {}),
      title: `New applicant shortlisted — ${toTitle}`,
      body: `${app.name} has been shortlisted for "${toTitle}". Please set your interview availability.`,
      href: '/mentor/projects', tier: 'action',
    });
  }

  function doExtendOffer() {
    if (!app) return;
    recordDecision('Advanced to offer', app.id);
    router.push(`/offer-letter?appId=${app.id}`);
  }

  function doMentorSaveSlots(slots: { date: string; time: string; duration?: string }[]) {
    if (!app) return;
    saveApp({ ...app, interviewSlots: slots, rescheduleNote: undefined });
    setScheduleOpen(false);
    showToast(`Availability sent to ${app.name}`);
    addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Interview availability — action required', body: `Interview time slots have been sent for your ${app.programmeName} application. Please confirm your preferred time.`, href: '/apply/dashboard', tier: 'action' });
  }

  function doMentorReschedule(slots: { date: string; time: string; duration?: string }[]) {
    if (!app) return;
    saveApp({
      ...app,
      status:         'Shortlisted for Interview',
      interviewSlots: slots,
      confirmedSlot:  undefined,
      meetingLink:    undefined,
      rescheduleNote: undefined,
    });
    setRescheduleOpen(false);
    showToast('New slots sent — awaiting confirmation.');
    addNotification({ forRole: 'applicant', forEmail: app.email, title: 'New interview slots available', body: `New interview time slots have been sent for your ${app.programmeName} application. Please confirm your preferred time.`, href: '/apply/dashboard', tier: 'action' });
  }

  function doMarkInterviewComplete() {
    if (!app) return;
    saveApp({ ...app, status: 'Interview Completed' });
    showToast('Interview marked as completed.');
  }

  async function handleChatSend(text?: string) {
    const content = (text ?? '').trim();
    if (!content || chatLoading || !app) return;
    const userMsg: ChatMsg = { role: 'user', content };
    const next = [...chatMessages, userMsg];
    setChatMessages([...next, { role: 'assistant', content: '' }]);
    setChatLoading(true);
    const project = app.shortlistedFor ? projects.find(p => p.id === app.shortlistedFor) ?? null : null;
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
            scores: app.mentorScores ?? { technicalKnowledge: 0, problemSolving: 0, communication: 0, initiativeDrive: 0 },
            notes: app.mentorNotes ?? '',
            transcript: app.mentorTranscript ?? '',
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
      }
    } catch {
      setChatMessages([...next, { role: 'assistant', content: 'Network error — could not reach the server. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  /* ── Loading / not found ──────────────────────────────────────────────── */
  if (apps.length === 0) {
    return (
      <Shell activeRoute="/candidate360">
        <div className="flex items-center justify-center h-64 text-fg-muted text-body-sm">Loading…</div>
      </Shell>
    );
  }

  if (!app) {
    return (
      <Shell activeRoute="/candidate360">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-body-md text-fg-muted">Applicant not found.</p>
          <button onClick={() => router.back()} className="text-accent text-body-sm underline">Go back</button>
        </div>
      </Shell>
    );
  }

  // AUG-052/TOA-100/117 — a mentor may only open a candidate shortlisted to one of
  // their own projects. Without this, a mentor could URL-hop to any candidate's full
  // record (incl. masked PII). IO/IO-admin/director/AD are not scoped here.
  if (role === 'mentor') {
    const assignedToMe = !!app.shortlistedFor
      && projects.some(p => p.id === app.shortlistedFor && mentorIdMatches(p.mentorUserId, profile.email));
    if (!assignedToMe) {
      return (
        <Shell activeRoute="/candidate360">
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-warning-bg border border-warning/20 flex items-center justify-center">
              <Lock size={20} className="text-warning" />
            </div>
            <p className="text-body-md font-semibold text-fg">You don&apos;t have access to this candidate</p>
            <p className="text-body-sm text-fg-muted max-w-sm">Mentors can only view candidates shortlisted to their own projects. If you believe this is an error, contact the internship office.</p>
            <button onClick={() => router.back()} className="text-accent text-body-sm underline">Go back</button>
          </div>
        </Shell>
      );
    }
  }

  const initials = app.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* The application whose data the right column displays (can differ from the URL app).
     Use scoredApps so suitability components are backfilled → live re-weighting works. */
  const viewApp = scoredApps.find(a => a.id === (selectedViewAppId ?? app.id)) ?? app;

  /* Recommendation-card handlers */
  const updateWeights = (w: ScoringWeights) => { setWeights(w); saveWeights(w); };
  const onRevealParticular = (label: string, reason: string) => {
    logAccess({ actor: actorName, action: 'reveal', detail: `Revealed ${label} — reason: ${reason}`, subjectId: viewApp.id });
    setAccessLog(getAccessLog(viewApp.id));
  };
  const toggleRecommend = (projectId: string) => {
    setPutForward(prev => {
      const added = !prev.includes(projectId);
      const next = added ? [...prev, projectId] : prev.filter(p => p !== projectId);
      try {
        const all = JSON.parse(localStorage.getItem('dsta_putforward') ?? '{}') as Record<string, string[]>;
        all[viewApp.id] = next;
        localStorage.setItem('dsta_putforward', JSON.stringify(all));
      } catch {}
      const projTitle = projects.find(p => p.id === projectId)?.title ?? projectId;
      recordDecision(`${added ? 'Recommended' : 'Recommendation removed'}: ${projTitle}`, viewApp.id);
      showToast(added ? 'Recommended — put forward for this candidate.' : 'Recommendation removed.');
      return next;
    });
  };

  const hasMentor  = !!viewApp.mentorScores;
  const avgScore   = hasMentor
    ? (Object.values(viewApp.mentorScores!).reduce((a, b) => a + b, 0) / 4)
    : null;

  /* Progressive section gates — based on viewApp */
  const showInterviewCard  = SHORTLISTED_ONWARDS.has(viewApp.status);
  const showEvalCard       = EVAL_ONWARDS.has(viewApp.status);
  const showPlacementCard  = OFFER_ONWARDS.has(viewApp.status);
  const placedProject      = viewApp.shortlistedFor ? projects.find(p => p.id === viewApp.shortlistedFor) : null;
  // Next untried ranked preference for rematch (TOA-090/124).
  const triedSet           = new Set([...(app.triedProjects ?? []), ...(app.shortlistedFor ? [app.shortlistedFor] : [])]);
  const nextPrefId         = app.projectRankings.find(pid => !triedSet.has(pid));
  const nextPrefProj       = nextPrefId ? projects.find(p => p.id === nextPrefId) : null;
  const confirmedSlotData  = viewApp.interviewSlots && viewApp.confirmedSlot !== undefined
    ? viewApp.interviewSlots[viewApp.confirmedSlot] : null;
  const shortlistedRaw = viewApp.suitabilityScores.find(s => s.projectId === viewApp.shortlistedFor);
  const shortlisted    = shortlistedRaw ? { ...shortlistedRaw, score: reweightScore(shortlistedRaw, weights) } : undefined;

  /* Tab availability */
  const showInterviewTab   = SHORTLISTED_ONWARDS.has(viewApp.status);
  const showFeedbackTab    = viewApp.status === 'Internship Completed';

  /* ── Status-aware footer ──────────────────────────────────────────────── */
  const isPending       = app.status === 'Pending Screening' || app.status === 'Pending Review';
  const isAutoRej       = app.status === 'Auto-rejected';
  const isIntComp       = app.status === 'Interview Completed';
  const isDateChangeReq = app.status === 'Date Change Requested';
  const isFinal         = ['Auto-rejected','Accepted','Rejected','Offer Accepted','Offer Declined','Active Intern','Internship Completed','Withdrawn','Terminated'].includes(app.status);
  const showFooter      = !isFinal;

  /* Mentor-specific */
  const isMentor              = role === 'mentor';
  const mentorNeedsSchedule   = isMentor && app.status === 'Shortlisted for Interview' && !app.interviewSlots?.length;
  const mentorAwaitingConfirm = isMentor && app.status === 'Shortlisted for Interview' && !!app.interviewSlots?.length;
  const mentorInterviewSet    = isMentor && app.status === 'Interview Scheduled';
  const mentorNeedsEval       = isMentor && app.status === 'Interview Completed' && !app.mentorDecision;
  const mentorEvalDone        = isMentor && app.status === 'Interview Completed' && !!app.mentorDecision;
  const showMentorFooter      = isMentor && (mentorNeedsSchedule || mentorAwaitingConfirm || mentorInterviewSet || mentorNeedsEval || mentorEvalDone);

  const openApp = (aid: string) => { setSelectedViewAppId(aid); setViewTab('overview'); };


  /* ════════ APPLICATION DETAIL VIEW — two-column internal record ════════ */
  const first = givenNameOf(app.name);
  const nowYear = new Date().getFullYear();

  /* Ranked project fit — real 3-factor suitability, live-reweighted. */
  const fitRanked = [...(viewApp.suitabilityScores ?? [])]
    .map(s => ({ s, fit: reweightScore(s, weights) }))
    .sort((a, b) => b.fit - a.fit);
  const topFit = fitRanked[0]
    ? { title: projects.find(p => p.id === fitRanked[0].s.projectId)?.title ?? fitRanked[0].s.projectTitle, fit: fitRanked[0].fit }
    : null;
  const eligible = viewApp.eligibilityPass && viewApp.status !== 'Auto-rejected';
  const verdict = recommendVerdict(eligible, topFit?.fit ?? 0);

  /* Touchpoints (applications + DSTA engagements) → engagement lead score. */
  const journeyItems: { kind: string; year: number }[] = [
    ...history.map(h => ({ kind: 'application', year: new Date(h.appliedDate).getFullYear() })),
    ...(dstaEngagements ?? []).map(e => ({ kind: e.kind ?? 'other', year: e.year })),
  ];
  const touchpointCount = journeyItems.length;
  const journeyYears = Array.from(new Set(journeyItems.map(t => t.year)));
  const engagement = scoreEngagement(journeyItems, nowYear);

  /* Soft profile (human side) — real fields where present, else mocked. */
  const soft = buildSoftProfile(viewApp);

  /* AI summary narrative. (Per-factor sub-scores live in the Programme fit card,
     next to the weighting control — not duplicated here.) */
  const aiNarrative = buildAiNarrative(viewApp, topFit);

  /* Assessment rows — eligibility, AI match, interview. */
  type Assessment = { label: string; note: string; by: string; score: string; cls: string };
  const assessments: Assessment[] = [];
  assessments.push(viewApp.eligibilityOverride
    ? { label: 'Eligibility screening', note: `Overridden (grey case): ${viewApp.eligibilityOverride.reason}`, by: `${viewApp.eligibilityOverride.by} · ${new Date(viewApp.eligibilityOverride.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, score: 'Overridden', cls: 'bg-warning-bg text-warning' }
    : eligible
    ? { label: 'Eligibility screening', note: 'All programme criteria met.', by: `Automated check · ${new Date(viewApp.appliedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, score: 'Passed', cls: 'bg-success-bg text-success' }
    : { label: 'Eligibility screening', note: viewApp.failedCriteria[0]?.replace(/\s*\((Mandatory|Preferred)\)\s*$/, '') ?? 'Did not meet criteria.', by: `Automated check · ${new Date(viewApp.appliedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, score: 'Failed', cls: 'bg-danger-bg text-danger' });
  if (eligible && topFit) {
    assessments.push({ label: `Best project fit (${topFit.title})`, note: 'How well this candidate fits the project (0–100), from discipline, skills & academic standing. Advisory — the decision stays with you.', by: 'Project-fit scoring', score: `${topFit.fit} / 100`, cls: 'bg-accent/10 text-accent' });
  }
  if (EVAL_ONWARDS.has(viewApp.status) && avgScore != null) {
    assessments.push({ label: 'Interview', note: `Panel evaluation · ${viewApp.mentorDecision === 'Accepted' ? 'recommended to proceed' : viewApp.mentorDecision === 'Rejected' ? 'recommended to reject' : viewApp.mentorDecision === 'Referred' ? 'recommended for referral' : 'on file'}.`, by: 'Interview panel', score: `${avgScore.toFixed(1)} / 10`, cls: viewApp.mentorDecision === 'Rejected' ? 'bg-danger-bg text-danger' : viewApp.mentorDecision === 'Referred' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success' });
  } else if (viewApp.status === 'Interview Scheduled' && confirmedSlotData) {
    assessments.push({ label: 'Interview', note: `Scheduled for ${fmtSlot(confirmedSlotData)}.`, by: 'Interview panel', score: 'Upcoming', cls: 'bg-accent/10 text-accent' });
  }

  /* This cycle activity log — derived from status + dates (mirrors buildTimeline). */
  type CycleEvent = { icon: React.ElementType; title: string; body: string; actor: string; when: string; dot: string };
  const cycleEvents: CycleEvent[] = [];
  const appliedLong = new Date(viewApp.appliedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (OFFER_ONWARDS.has(viewApp.status)) {
    cycleEvents.push({ icon: Mail, title: 'Offer extended', body: `Offer prepared for ${topFit?.title ?? 'the placement'}.`, actor: 'Internship Officer', when: 'Recent', dot: 'bg-accent/10 text-accent' });
  }
  if (EVAL_ONWARDS.has(viewApp.status)) {
    cycleEvents.push({ icon: ClipboardList, title: 'Interview evaluation submitted', body: viewApp.mentorDecision === 'Rejected' ? 'Panel recommended rejection.' : viewApp.mentorDecision === 'Referred' ? 'Panel recommended referral.' : 'Recommended to proceed.', actor: 'Interview panel', when: 'Recent', dot: viewApp.mentorDecision === 'Rejected' ? 'bg-danger-bg text-danger' : viewApp.mentorDecision === 'Referred' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success' });
  }
  if (viewApp.status === 'Interview Scheduled' && confirmedSlotData) {
    cycleEvents.push({ icon: CalendarDays, title: 'Interview scheduled', body: fmtSlot(confirmedSlotData), actor: 'Scheduling', when: 'Recent', dot: 'bg-accent/10 text-accent' });
  }
  if (SHORTLISTED_ONWARDS.has(viewApp.status)) {
    cycleEvents.push({ icon: CheckCircle2, title: 'Shortlisted for interview', body: 'Advanced from eligibility screening.', actor: 'Internship Officer', when: 'Earlier', dot: 'bg-success-bg text-success' });
  }
  cycleEvents.push(eligible
    ? { icon: ShieldCheck, title: 'Eligibility check passed', body: 'Citizenship, year of study and GPA meet programme criteria.', actor: 'Automated check', when: appliedLong, dot: 'bg-success-bg text-success' }
    : { icon: XCircle, title: 'Eligibility check failed', body: viewApp.failedCriteria[0]?.replace(/\s*\((Mandatory|Preferred)\)\s*$/, '') ?? 'Did not meet criteria.', actor: 'Automated check', when: appliedLong, dot: 'bg-danger-bg text-danger' });
  cycleEvents.push({ icon: FileText, title: 'Application submitted', body: `Ranked ${viewApp.projectRankings?.length ?? 0} project preference${(viewApp.projectRankings?.length ?? 0) === 1 ? '' : 's'} · documents attached.`, actor: first, when: appliedLong, dot: 'bg-accent/10 text-accent' });

  /* Header CTAs — stage-aware. */
  const docs: { name?: string; data?: string; label: string; meta: string }[] = [
    { label: 'Curriculum Vitae', name: viewApp.cvFileName, data: viewApp.cvFileData, meta: 'PDF' },
    { label: 'Academic Transcript', name: viewApp.transcriptFileName, data: viewApp.transcriptFileData, meta: 'PDF' },
  ];

  return (
    <Shell activeRoute="/candidate360">
      <div className="pb-32">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-4 text-label-md">
          {fromShortlist ? (
            <>
              <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/applications')}>Applications</span>
              <ChevronRight size={16} className="text-fg-subtle" />
              <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors truncate max-w-[260px]" onClick={() => router.push(`/shortlist/${id}`)}>{app.name}</span>
              <ChevronRight size={16} className="text-fg-subtle" />
              <span className="text-fg">Candidate 360</span>
            </>
          ) : fromProjects ? (
            <>
              <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors" onClick={() => router.push('/projects')}>Projects</span>
              <ChevronRight size={16} className="text-fg-subtle" />
              <span className="text-fg-muted cursor-pointer hover:text-accent transition-colors truncate max-w-[260px]" onClick={() => router.push(`/projects/${fromProjId}`)}>
                {projects.find(p => p.id === fromProjId)?.title ?? 'Project'}
              </span>
              <ChevronRight size={16} className="text-fg-subtle" />
              <span className="text-fg">Candidate 360</span>
            </>
          ) : (
            <>
              <span
                className="text-fg-muted cursor-pointer hover:text-accent transition-colors"
                onClick={() => router.push(fromInterviews ? '/mentor/interviews' : fromMentor ? '/mentor/projects' : fromInterns ? '/interns' : '/applications')}
              >
                {fromInterviews ? 'Interviews' : fromMentor ? 'My Projects' : fromInterns ? 'Interns' : 'Applications'}
              </span>
              <ChevronRight size={16} className="text-fg-subtle" />
              <span className="text-fg truncate max-w-[400px]">{app.name}</span>
            </>
          )}
        </nav>
        {/* Identity header — avatar + name + status + Returning + stage-aware actions.
            Bare on the canvas (no card) to match the project / programme detail page
            headers; the card wrapper was redundant chrome and inconsistent. */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-4 min-w-0">
            {/* prototype: 52px avatar, navy→teal brand gradient, white initials, 18px/700 */}
            <div className="rounded-full text-white font-bold text-[18px] flex items-center justify-center shrink-0 select-none" style={{ width: 52, height: 52, background: 'var(--toa-brand-gradient)' }}>{initials}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[22px] font-bold tracking-[-0.01em] text-fg truncate">{app.name}</h1>
                <StatusBadge status={app.status} />
                {app.previousDSTA && (
                  <span
                    title="Prior involvement with DSTA — e.g. a past programme, event or application."
                    className="inline-flex items-center gap-1 text-body-sm font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full"
                  >
                    <Repeat size={12} />Returning to DSTA
                  </span>
                )}
                {(PROG_CATEGORY[app.programmeId] ?? []).includes('University') && app.year > 0 && app.year !== TYPICAL_UNI_YEAR && (
                  <span
                    title={`Typical university intake is Year ${TYPICAL_UNI_YEAR} — other years are assessed case-by-case (DSTA HR guidance).`}
                    className="inline-flex items-center gap-1 text-body-sm font-bold text-info bg-info-bg border border-info/20 px-2.5 py-0.5 rounded-full"
                  >
                    <Info size={12} />Year {app.year} · case-by-case
                  </span>
                )}
                {app.eligibilityOverride && (
                  <span
                    title={`Eligibility overridden by ${app.eligibilityOverride.by} on ${app.eligibilityOverride.date} — ${app.eligibilityOverride.reason}`}
                    className="inline-flex items-center gap-1 text-body-sm font-bold text-warning bg-warning-bg border border-warning/20 px-2.5 py-0.5 rounded-full"
                  >
                    <AlertTriangle size={12} />Eligibility overridden
                  </span>
                )}
                {app.matchOverride && (
                  <span
                    title={`Shortlisted off the AI top fit by ${app.matchOverride.by} on ${app.matchOverride.date} — ${app.matchOverride.reason}`}
                    className="inline-flex items-center gap-1 text-body-sm font-bold text-warning bg-warning-bg border border-warning/20 px-2.5 py-0.5 rounded-full"
                  >
                    <AlertTriangle size={12} />Match overridden
                  </span>
                )}
                {app.projectArchived && (
                  <span
                    title={`"${app.projectArchived.project}" was archived on ${app.projectArchived.date} — ${app.projectArchived.reason || 'no reason given'}. Rematch to another preference.`}
                    className="inline-flex items-center gap-1 text-body-sm font-bold text-danger bg-danger-bg border border-danger/20 px-2.5 py-0.5 rounded-full"
                  >
                    <AlertTriangle size={12} />Project archived — rematch needed
                  </span>
                )}
              </div>
              <p className="text-body-sm text-fg-muted mt-1 truncate">
                {app.school} · {app.course}{app.gpa > 0 ? ` · GPA ${app.gpa.toFixed(2)}` : ''}
              </p>
            </div>
          </div>

          {/* Stage-aware header actions — primary names the next concrete step. */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Archived shortlisted project (TOA-025) — rematch takes priority over the
                stage actions, which would otherwise point at a project that's gone. */}
            {!isMentor && showFooter && app.projectArchived && (
              nextPrefProj
                ? <Button title={`Move to next preference: ${nextPrefProj.title}`} onClick={() => doRematch(nextPrefProj.id)}><Repeat size={14} />Rematch to next preference</Button>
                : <>
                    <span className="text-body-sm font-medium text-danger self-center">No further preferences to rematch</span>
                    <Button variant="danger" onClick={() => openRejectModal(remark => doReject(remark))}><UserX size={14} />Reject</Button>
                  </>
            )}
            {!isMentor && showFooter && !app.projectArchived && (
              <>
                {isPending && (
                  <>
                    {!eligible
                      ? <>
                          <Button onClick={() => { setOverrideReason(''); setOverrideOpen(true); }}><Eye size={14} />Override eligibility</Button>
                          <Button variant="danger" onClick={() => openRejectModal(remark => doReject(remark))}><UserX size={14} />Reject</Button>
                        </>
                      : <>
                          <Button onClick={() => { recordDecision('Advanced to shortlist', app.id); router.push(`/shortlist/${app.id}`); }}><UserCheck size={14} />Advance to Shortlisted</Button>
                          <Button variant="danger" onClick={() => openRejectModal(remark => doReject(remark))}><UserX size={14} />Reject</Button>
                        </>}
                  </>
                )}
                {isAutoRej && (
                  <>
                    <Button variant="outline" onClick={() => { setOverrideReason(''); setOverrideOpen(true); }}><Eye size={14} />Override eligibility</Button>
                    <Button variant="danger" onClick={() => openRejectModal(remark => doReject(remark))}><UserX size={14} />Confirm rejection</Button>
                  </>
                )}
                {app.status === 'Shortlisted for Interview' && (
                  <>
                    <Button onClick={() => showToast('Schedule interview…')}><CalendarDays size={14} />Schedule interview</Button>
                    <Button variant="danger" onClick={() => openRejectModal(remark => doReject(remark))}><UserX size={14} />Reject</Button>
                  </>
                )}
                {app.status === 'Interview Scheduled' && (
                  <>
                    <Button onClick={() => showToast('Record interview outcome…')}><ClipboardList size={14} />Record interview outcome</Button>
                    <Button variant="danger" onClick={() => openRejectModal(remark => doReject(remark))}><UserX size={14} />Reject</Button>
                  </>
                )}
                {isIntComp && localMentorDecision === null && (
                  <>
                    <Button onClick={() => setAcceptConfirmOpen(true)}><Check size={14} />Record interview outcome</Button>
                    {nextPrefProj && (
                      <Button variant="secondary" title={`Move to next preference: ${nextPrefProj.title}`} onClick={() => doRematch(nextPrefProj.id)}><Repeat size={14} />Rematch to next preference</Button>
                    )}
                    <Button variant="danger" onClick={() => openRejectModal(remark => doRecordMentorDecision('Rejected', remark), true)}><UserX size={14} />Reject</Button>
                  </>
                )}
                {isIntComp && localMentorDecision === 'Accepted' && (
                  <Button onClick={doExtendOffer}><Mail size={14} />Advance to Offer</Button>
                )}
                {isIntComp && (localMentorDecision === 'Rejected' || localMentorDecision === 'Referred') && nextPrefProj && (
                  <Button variant="secondary" title={`Move to next preference: ${nextPrefProj.title}`} onClick={() => doRematch(nextPrefProj.id)}><Repeat size={14} />Rematch to next preference</Button>
                )}
                {isDateChangeReq && (
                  <Button onClick={() => { setDateChangeNote(''); setDateChangeOpen(true); }}><CalendarClock size={14} />Review date request</Button>
                )}
                {/* Security clearance — parallel track, can start any time after shortlist */}
                {SHORTLISTED_ONWARDS.has(app.status) && (
                  !app.securityClearance
                    ? <Button variant="outline" onClick={doInitiateClearance}><ShieldCheck size={14} />Initiate clearance</Button>
                    : app.securityClearance.status === 'in-progress'
                      ? <>
                          <span title={`Clearance started ${app.securityClearance.startedDate}`} className="inline-flex items-center gap-1 text-body-sm font-semibold text-warning bg-warning-bg border border-warning/20 px-2.5 py-1 rounded-full"><Clock size={12} />Clearance in progress</span>
                          <Button variant="outline" onClick={doCompleteClearance}><ShieldCheck size={14} />Mark cleared</Button>
                        </>
                      : <span title={`Cleared ${app.securityClearance.completedDate ?? ''}`} className="inline-flex items-center gap-1 text-body-sm font-semibold text-success bg-success-bg border border-success/20 px-2.5 py-1 rounded-full"><ShieldCheck size={12} />Security cleared</span>
                )}
              </>
            )}
            <Button variant="secondary" aria-label={`Open ${viewApp.name}’s application`} onClick={() => router.push(`/shortlist/${viewApp.id}`)}><FileText size={14} />Open application</Button>
          </div>
        </div>

        {/* ── Two-column body: insight (left) · journey + records (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] gap-5 items-start">

          {/* ───────── LEFT: AI insight + human side + engagement ───────── */}
          <div className="flex flex-col gap-4 min-w-0">

            {aiSummaryOn && (
              <AiSummaryPanel
                app={viewApp}
                narrative={aiNarrative}
                touchpoints={touchpointCount}
                years={journeyYears.length}
                topFit={topFit}
                engagement={engagement}
                messages={chatMessages}
                loading={chatLoading}
                onAsk={(q) => handleChatSend(q)}
              />
            )}

            {/* Beyond the résumé */}
            <BeyondResumeCard soft={soft} first={first} />

            {/* Engagement — warmth/lead score (CRM signal; advisory, not a hiring input). */}
            {engagement && (
              <Card>
                <div className="flex items-center gap-4">
                  <EngagementGauge value={engagement.value} tier={engagement.tier} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-body-md font-semibold text-fg">Engagement</h2>
                      <span className={cn('inline-flex items-center gap-1.5 text-body-sm font-bold px-2.5 py-0.5 rounded-full', engagement.tier.cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', engagement.tier.dot)} />{engagement.tier.label} lead
                      </span>
                      {engagement.isRepeat && (
                        <span className="inline-flex items-center gap-1 text-body-sm text-fg-muted"><Repeat size={12} className="text-accent" />Loyal · repeat engager</span>
                      )}
                    </div>
                    <p className="text-body-sm text-fg-muted mt-1.5 leading-snug">{engagement.tier.blurb}</p>
                    <p className="text-body-sm text-fg-muted mt-1">
                      {engagement.touchpoints} touchpoint{engagement.touchpoints === 1 ? '' : 's'} across {engagement.channels} channel{engagement.channels === 1 ? '' : 's'}
                      {engagement.topDriver ? ` · strongest: ${engagement.topDriver.label.toLowerCase()} (${engagement.topDriver.year})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 mt-4 px-4 py-3 rounded-xl border border-border bg-bg-subtle">
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-bold uppercase tracking-widest text-fg-subtle">Recommended comms</p>
                    <p className="text-body-sm font-semibold text-fg mt-0.5">{engagement.tier.cadence}</p>
                  </div>
                  <Button size="sm" onClick={() => showToast(`${engagement.tier.action} — ${first} queued for eDM`)}><Mail size={14} />{engagement.tier.action}</Button>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-body-sm text-fg-muted leading-snug">
                  <Info size={12} className="mt-0.5 shrink-0" />A warmth score: how recently and how often this person has engaged with DSTA. Use it to decide who to reach out to first — it doesn&apos;t affect the hiring decision.
                </p>
              </Card>
            )}
          </div>

          {/* ───────── RIGHT: DSTA journey + record disclosures ───────── */}
          <div className="flex flex-col gap-4 min-w-0">

            {/* DSTA Journey hero */}
            <Card>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="text-body-md font-semibold text-fg">DSTA Journey</h2>
                <span className="text-body-sm text-fg-muted tabular-nums">{touchpointCount} touchpoint{touchpointCount === 1 ? '' : 's'} · {journeyYears.length} year{journeyYears.length === 1 ? '' : 's'}</span>
              </div>
              <p className="text-body-sm text-fg-muted mt-1.5 mb-3 leading-snug">Every interaction {first} has had with DSTA — open any touchpoint to review its record.</p>
              <C360JourneyTimeline
                history={history}
                engagements={dstaEngagements}
                projects={projects}
                weights={weights}
                onOpenApp={openApp}
                onToast={showToast}
              />
            </Card>

            {/* Project fit & recommendation */}
            <Disclosure title="Project fit & recommendation" badge={verdict.label} badgeCls={verdict.cls}>
              {fitRanked.length === 0 ? (
                <p className="flex items-center gap-2 text-body-sm text-fg-muted py-2"><Info size={13} />No project fit — candidate is ineligible this cycle.</p>
              ) : (
                <div className="pt-2">
                  <h3 className="text-body-sm font-semibold text-fg mb-3">Best-fit projects to put them forward for</h3>

                  {/* 3-factor weighting control */}
                  <div className="mb-3 space-y-2.5 rounded-xl border border-accent/15 bg-surface p-3">
                    <span className="text-body-sm font-bold text-fg">Score weighting</span>
                    <WeightAllocator weights={weights} onChange={updateWeights} />
                    <p className="text-caption text-fg-muted leading-snug">Drag a divider to trade between two factors — discipline, project skills and academic standing always total 100%. The list below re-ranks as you adjust. Saved for your session.</p>
                  </div>

                  {/* Ranked fit rows — rank # · fit% · ↑/↓ change · name + tags · why · sub-scores · Recommend */}
                  <FitRankedList items={fitRanked} putForward={putForward} viewApp={viewApp} projects={projects} onToggle={toggleRecommend} />
                  {putForward.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 text-body-sm text-success bg-success-bg/60 border border-success/30 rounded-xl px-3 py-2.5 leading-snug">
                      <CheckCircle2 size={13} className="shrink-0" />
                      {putForward.length} project{putForward.length === 1 ? '' : 's'} marked to put {first} forward — these become recommendations the IO can action.
                    </p>
                  )}
                  <p className="mt-3 flex items-start gap-1.5 text-body-sm text-fg-subtle leading-snug">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />Fit scores are computed from discipline, skills &amp; standing — advisory only; the decision stays with you. Academic standing is graded within each candidate&apos;s own qualification, since poly, university and JC grades use different scales and aren&apos;t compared directly.
                  </p>
                </div>
              )}
            </Disclosure>

            {/* Assessments & scores */}
            <Disclosure title="Assessments & scores" count={assessments.length}>
              <div className="flex flex-col gap-2.5 pt-2">
                {assessments.map((a, i) => (
                  /* No sparkle here: every assessment row is source-of-record or a
                     deterministic formula (project-fit scoring), never an AI generation. */
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-bold text-fg">{a.label}</p>
                      <p className="text-body-sm text-fg-muted mt-0.5 leading-snug">{a.note}</p>
                      <p className="text-body-sm text-fg-muted mt-1.5">{a.by}</p>
                    </div>
                    <span className={cn('text-body-sm font-bold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap tabular-nums', a.cls)}>{a.score}</span>
                  </div>
                ))}
              </div>
            </Disclosure>

            {/* This cycle · activity log */}
            <Disclosure title="Activity for this cycle">
              {/* Custom PRIZM-styled vertical timeline — icon node beside a white entry
                  card, no rail. Chronology = most-recent-first order + per-entry date. */}
              <div className="flex flex-col gap-4 pt-2">
                {cycleEvents.map((e, i) => {
                  const E = e.icon;
                  return (
                    <div key={i} className="flex items-start gap-3.5">
                      <span className={cn('grid place-items-center w-9 h-9 rounded-full shrink-0', e.dot)}>
                        <E size={14} />
                      </span>
                      <div className="flex-1 rounded-xl border border-border bg-surface shadow-sm px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-body-sm font-bold text-fg">{e.title}</span>
                          <span className="text-body-sm text-fg-muted shrink-0">{e.when}</span>
                        </div>
                        <p className="text-body-sm text-fg-muted mt-1 leading-snug">{e.body}</p>
                        <p className="text-body-sm mt-1.5"><span className="font-semibold text-fg">{e.actor}</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Disclosure>

            {/* Record & documents */}
            <Disclosure title="Record & documents">
              <div className="pt-2 space-y-4">
                {/* Purpose-of-access banner (IM8 purpose limitation) */}
                <p className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/[0.05] px-3.5 py-2.5 text-body-sm text-fg-muted leading-snug">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
                  You&apos;re accessing {first}&apos;s record to assess this application for {PROG_NAME[viewApp.programmeId] ?? viewApp.programmeName}. Access and any reveal of personal particulars are logged under IM8 and attributed to you.
                </p>
                <ProtectedParticularsCard app={viewApp} role={role} onReveal={onRevealParticular} />
                <Card>
                  <OverlineLabel>Education</OverlineLabel>
                  <div className="space-y-2.5">
                    <Fact label="Institution" value={viewApp.school} />
                    <Fact label="Course" value={viewApp.course} />
                    <Fact label="Year / Level" value={`Year ${viewApp.year}`} />
                    {viewApp.gpa > 0 && <Fact label="GPA" value={viewApp.gpa.toFixed(2)} />}
                    <Fact label="Programme" value={PROG_NAME[viewApp.programmeId] ?? viewApp.programmeName} />
                  </div>
                </Card>
                <Card>
                  <OverlineLabel>Documents</OverlineLabel>
                  <div className="flex flex-col gap-2">
                    {docs.map((d, i) => <DocLink key={i} label={d.label} name={d.name} data={d.data} />)}
                  </div>
                </Card>
              </div>
            </Disclosure>

            {/* Access log (IM8) */}
            <Disclosure title="Access log (IM8)" count={accessLog.length}>
              <div className="pt-2">
                <p className="text-body-sm text-fg-muted mb-3 leading-snug">Who viewed or changed this record (IM8 audit). Reveal events on masked fields are logged here too.</p>
                <AccessLogCard entries={accessLog} />
              </div>
            </Disclosure>
          </div>
        </div>

      </div>


      {/* IO actions now live in the header (stage-aware primary CTA, README §4). */}

      {/* ── Sticky footer — Mentor ───────────────────────────────────────────── */}
      {showMentorFooter && (
        <div className="fixed bottom-0 md:left-[112px] left-0 right-0 z-20 bg-surface border-t border-border px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <StatusBadge status={app.status} />
            </div>
            {mentorNeedsSchedule && (
              <p className="text-body-sm text-fg-muted">Set your available slots so {givenNameOf(app.name)} can confirm a time.</p>
            )}
            {mentorAwaitingConfirm && (
              <p className="text-body-sm text-fg-muted">Slots sent — waiting for {givenNameOf(app.name)} to confirm.</p>
            )}
            {mentorInterviewSet && app.interviewSlots && app.confirmedSlot !== undefined && (
              <p className="text-body-sm text-fg-muted">
                Scheduled for {fmtSlot(app.interviewSlots[app.confirmedSlot])}
                {app.interviewSlots[app.confirmedSlot].duration ? ` · ${app.interviewSlots[app.confirmedSlot].duration}` : ''}
              </p>
            )}
            {mentorEvalDone && (
              <p className={cn('text-body-sm font-semibold', app.mentorDecision === 'Accepted' ? 'text-success' : app.mentorDecision === 'Referred' ? 'text-warning' : 'text-danger')}>
                {app.mentorDecision === 'Accepted' ? 'Recommend for offer' : app.mentorDecision === 'Referred' ? 'Refer' : 'Reject'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mentorNeedsSchedule && (
              <Button onClick={() => setScheduleOpen(true)}>
                <CalendarClock size={14} />Set Availability
              </Button>
            )}
            {mentorAwaitingConfirm && (
              <Button variant="outline" onClick={() => setScheduleOpen(true)}>
                <CalendarClock size={14} />Change Availability
              </Button>
            )}
            {mentorInterviewSet && (
              <>
                <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
                  <CalendarClock size={14} />Reschedule
                </Button>
                <Button onClick={() => setMarkCompleteOpen(true)}>
                  <Check size={14} />Mark as Completed
                </Button>
              </>
            )}
            {mentorNeedsEval && (
              <Button onClick={() => router.push(`/mentor/interviews/${app.id}`)}>
                <Check size={14} />Submit Evaluation
              </Button>
            )}
          </div>
        </div>
      )}


      <Toast message={toast} />

      {/* ── IO: Reject confirmation modal ───────────────────────────────────── */}
      {rejectModal && app && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-xl border border-border shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-headline-md text-fg mb-1">Reject {givenNameOf(app.name)}?</h2>
            <p className="text-body-md text-fg-muted mb-4">Please provide a reason for rejecting this application.</p>
            <div className="mb-3">
              <label className="block text-label-sm text-fg mb-1.5">
                Rejection Reason <span className="text-danger">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectRemark}
                onChange={e => setRejectRemark(e.target.value)}
                placeholder="e.g. Does not meet the minimum GPA requirement for this programme…"
                className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger/40"
              />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 bg-bg-subtle rounded-xl border border-border mb-4">
              <Mail size={12} className="text-fg-muted mt-0.5 shrink-0" />
              <p className="text-body-md text-fg-muted leading-relaxed">
                <span className="font-semibold text-fg">{getRejectionTemplateName(app, rejectModal.isPostInterview)}</span>
                {' '}will be sent automatically to <span className="font-semibold text-fg">{app.email}</span>.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="danger"
                disabled={!rejectRemark.trim()}
                onClick={() => { rejectModal.onConfirm(rejectRemark.trim()); setRejectModal(null); setRejectRemark(''); }}
                className="flex-1 justify-center"
              >
                <UserX size={14} />Reject
              </Button>
              <Button variant="ghost" onClick={() => setRejectModal(null)} className="flex-1 justify-center">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Eligibility override (grey-case) — required reason, audited */}
      {overrideOpen && app && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-xl border border-border shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-headline-md text-fg mb-1">Override eligibility for {givenNameOf(app.name)}?</h2>
            <p className="text-body-md text-fg-muted mb-3">
              This keeps an applicant who failed automated screening in the review pool — use IO discretion for grey cases
              (e.g. a narrowly-missed threshold offset by strong achievements). The override and your reason are logged.
            </p>
            {app.failedCriteria.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-danger-bg/40 border border-danger/20 rounded-xl mb-3">
                <AlertTriangle size={13} className="text-danger mt-0.5 shrink-0" />
                <p className="text-body-sm text-fg-muted">
                  Failed: {app.failedCriteria.map(c => c.replace(/\s*\((Mandatory|Preferred)\)\s*$/, '')).join('; ')}
                </p>
              </div>
            )}
            <label className="block text-label-sm text-fg mb-1.5">
              Justification <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="e.g. GPA 3.38 vs 3.40 threshold; BrainHack 2025 winner + prior DSTA internship — recommend manual review."
              className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2.5 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4"
            />
            <div className="flex gap-2">
              <Button
                disabled={!overrideReason.trim()}
                onClick={() => { doOverrideEligibility(overrideReason.trim()); setOverrideOpen(false); setOverrideReason(''); }}
                className="flex-1 justify-center"
              >
                <Eye size={14} />Override &amp; review
              </Button>
              <Button variant="ghost" onClick={() => setOverrideOpen(false)} className="flex-1 justify-center">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accept confirm modal ────────────────────────────────────────────── */}
      <Modal open={acceptConfirmOpen} onClose={() => setAcceptConfirmOpen(false)} labelledBy="accept-applicant-title">
        <h2 id="accept-applicant-title" className="text-headline-sm font-bold text-fg mb-1">Accept {givenNameOf(app?.name ?? '')}?</h2>
        <p className="text-body-sm text-fg-muted mb-5">
          You are confirming that this applicant passed the interview and should proceed to the offer stage.
        </p>
        <div className="flex gap-2 justify-end">
          <Button onClick={() => { doRecordMentorDecision('Accepted'); setAcceptConfirmOpen(false); }}>
            <Check size={14} /> Confirm Accept
          </Button>
          <Button variant="ghost" onClick={() => setAcceptConfirmOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Start date change review modal ─────────────────────────────────── */}
      <Modal open={dateChangeOpen} onClose={() => setDateChangeOpen(false)} maxWidth="sm" labelledBy="date-change-review-title">
        <h2 id="date-change-review-title" className="text-headline-sm font-bold text-fg mb-0.5">Review Start Date Request</h2>
        <p className="text-body-sm text-fg-muted mb-4">
          <span className="font-semibold text-fg">{app.name}</span> has requested a change to their internship start date.
        </p>
        <div className="rounded-xl bg-bg-subtle border border-border p-4 mb-3 space-y-3">
          <div className="flex gap-6">
            {app.internshipStartDate && (
              <div>
                <p className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Current Start Date</p>
                <p className="text-body-sm font-semibold text-fg">{app.internshipStartDate}</p>
              </div>
            )}
            <div>
              <p className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Requested Date</p>
              <p className="text-body-sm font-semibold text-accent">{app.startDateChangeRequest?.requestedDate ?? '—'}</p>
            </div>
          </div>
          {/* Validation context (TOA-130): project duration + internship window. */}
          {(placedProject?.internshipDuration || app.internshipEndDate) && (
            <div className="flex gap-6 pt-1 border-t border-border">
              {placedProject?.internshipDuration && (
                <div>
                  <p className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Project Duration</p>
                  <p className="text-body-sm text-fg">{placedProject.internshipDuration}</p>
                </div>
              )}
              {app.internshipEndDate && (
                <div>
                  <p className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Internship Ends</p>
                  <p className="text-body-sm text-fg">{app.internshipEndDate}</p>
                </div>
              )}
            </div>
          )}
          {app.startDateChangeRequest?.reason && (
            <div className="pt-1 border-t border-border">
              <p className="text-body-sm font-bold uppercase tracking-widest text-fg-subtle mb-0.5">Reason</p>
              <p className="text-body-sm text-fg">{app.startDateChangeRequest.reason}</p>
            </div>
          )}
        </div>

        {/* Conflict warning — requested date vs internship window / large shift. */}
        {(() => {
          const req = app.startDateChangeRequest?.requestedDate;
          const cur = app.internshipStartDate;
          const end = app.internshipEndDate;
          if (!req) return null;
          const reqD = new Date(req + 'T00:00:00').getTime();
          const shift = cur ? Math.round((reqD - new Date(cur + 'T00:00:00').getTime()) / 86400000) : null;
          const afterEnd = end ? reqD >= new Date(end + 'T00:00:00').getTime() : false;
          const bigShift = shift != null && Math.abs(shift) > 14;
          if (!afterEnd && !bigShift) return null;
          return (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-warning-bg border border-warning/20 rounded-xl mb-3">
              <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="text-body-sm text-fg-muted">
                {afterEnd
                  ? 'The requested start date is on/after the internship end date — confirm the placement window with the PC before approving.'
                  : `This shifts the start by ${Math.abs(shift!)} days${shift! > 0 ? ' later' : ' earlier'} — it may affect the placement timeline and budget. Confirm with the PC.`}
              </p>
            </div>
          );
        })()}

        <label className="block text-[12px] font-bold uppercase tracking-widest text-fg-subtle mb-1.5">Decision note <span className="font-normal normal-case tracking-normal text-fg-subtle">(optional, logged)</span></label>
        <textarea
          rows={2} value={dateChangeNote} onChange={e => setDateChangeNote(e.target.value)}
          placeholder="e.g. Confirmed with PC; new window fits budget cycle."
          className="w-full rounded-xl border border-border bg-bg-subtle px-3 py-2 text-body-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button onClick={() => {
            const newDate = app.startDateChangeRequest!.requestedDate;
            saveApp({ ...app, status: 'Offer Extended' as const, internshipStartDate: newDate, startDateChangeRequest: undefined });
            recordDecision(`Start-date change approved → ${newDate}${dateChangeNote.trim() ? ` — ${dateChangeNote.trim()}` : ''}`, app.id);
            addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Start date change approved', body: `Your request to change the start date for ${app.programmeName} has been approved. Your new start date is ${newDate}.`, href: '/apply/applications', tier: 'info' });
            setDateChangeOpen(false);
          }}>
            Approve & Update Date
          </Button>
          <Button variant="outline" onClick={() => {
            saveApp({ ...app, status: 'Offer Extended' as const, startDateChangeRequest: undefined });
            recordDecision(`Start-date change rejected${dateChangeNote.trim() ? ` — ${dateChangeNote.trim()}` : ''}`, app.id);
            addNotification({ forRole: 'applicant', forEmail: app.email, title: 'Start date change request — outcome', body: `Your request to change the start date for ${app.programmeName} was not approved. Your original start date remains unchanged.`, href: '/apply/applications', tier: 'info' });
            setDateChangeOpen(false);
          }}>
            Reject Request
          </Button>
          <Button variant="ghost" onClick={() => setDateChangeOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {/* ── Mentor: Schedule drawer ──────────────────────────────────────────── */}
      {scheduleOpen && app && (
        <InterviewScheduleDrawer app={app} onClose={() => setScheduleOpen(false)} onSave={doMentorSaveSlots} />
      )}

      {rescheduleOpen && app && (
        <InterviewRescheduleDrawer app={app} onClose={() => setRescheduleOpen(false)} onSave={doMentorReschedule} />
      )}

      {markCompleteOpen && app && (
        <MarkCompleteConfirm
          app={app}
          onConfirm={goEvaluate => {
            doMarkInterviewComplete();
            setMarkCompleteOpen(false);
            if (goEvaluate) router.push(`/mentor/interviews/${app.id}`);
          }}
          onClose={() => setMarkCompleteOpen(false)}
        />
      )}


    </Shell>
  );
}
