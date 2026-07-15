'use client';

import { useState, useMemo, useEffect } from 'react';
import Shell from '@/components/layout/shell';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';
import {
  BarChart2, Users, CheckCircle2, TrendingUp, Briefcase,
  GraduationCap, Building2, RefreshCw, Target, MessageSquare,
  Star, ThumbsUp, AlertCircle, Loader2,
} from 'lucide-react';
import AiSparkleIcon from '@/components/ui-legacy/ai-sparkle-icon';
import { cn } from '@/lib/utils';
import type { Application, ProjectEntry } from '@/lib/types';
import seedApps from '@/data/applications.json';
import { loadProjects } from '@/lib/storage';
import type { Programme } from '@/lib/types';

/* ── Synthetic historical data (pre-2026 cycles) ────────────────────────── */
const CATEGORIES = ['University', 'Junior College', 'Polytechnic', 'Integrated Programme (IP)', 'Scholarship Candidate Interns (SCI)'] as const;
type Category = typeof CATEGORIES[number];

const CAT_COLOR: Record<Category, string> = {
  'University':                                '#00328a',
  'Junior College':                            '#0369a1',
  'Polytechnic':                               '#b45309',
  'Integrated Programme (IP)': '#7c3aed',
  'Scholarship Candidate Interns (SCI)':       '#15803d',
};

interface YearData {
  year: string;
  cats: Record<string, number>;
  acceptRate: number;
  utilRate: number;
  current?: boolean;
}

const HIST: YearData[] = [
  { year: '2022', cats: { 'University': 158, 'Junior College': 41, 'Polytechnic': 29, 'Scholarship Candidate Interns (SCI)': 54, 'Integrated Programme (IP)': 38 }, acceptRate: 72, utilRate: 68 },
  { year: '2023', cats: { 'University': 194, 'Junior College': 48, 'Polytechnic': 33, 'Scholarship Candidate Interns (SCI)': 68, 'Integrated Programme (IP)': 42 }, acceptRate: 78, utilRate: 74 },
  { year: '2024', cats: { 'University': 187, 'Junior College': 44, 'Polytechnic': 26, 'Scholarship Candidate Interns (SCI)': 79, 'Integrated Programme (IP)': 47 }, acceptRate: 81, utilRate: 77 },
  { year: '2025', cats: { 'University': 218, 'Junior College': 51, 'Polytechnic': 30, 'Scholarship Candidate Interns (SCI)': 88, 'Integrated Programme (IP)': 49 }, acceptRate: 85, utilRate: 82 },
];

const TALENT_PIPELINE = [
  { label: 'Total interns tracked (2022–2024 cohorts)', count: 450, pct: 100 },
  { label: 'Re-engaged — returned for a subsequent programme', count: 87, pct: 19 },
  { label: 'Awarded DSTA scholarship', count: 32, pct: 7 },
  { label: 'Joined DSTA full-time / direct hire', count: 18, pct: 4 },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */
function mapCategory(programmeName: string): Category | 'Other' {
  const n = programmeName.toLowerCase();
  if (n.includes('university') || n.includes('uni ') || n.includes(' ug ')) return 'University';
  if (n.includes('post jc') || n.includes('post junior college'))            return 'Junior College';
  if (n.includes('jc') || n.includes('junior college'))                      return 'Junior College';
  if (n.includes('post poly') || n.includes('post polytechnic'))             return 'Polytechnic';
  if (n.includes('poly'))                                                     return 'Polytechnic';
  if (n.includes('sci') || n.includes('scholarship candidate'))               return 'Scholarship Candidate Interns (SCI)';
  if (n.includes('ydsp') || n.includes('integrated') || n.includes('brainhack') || n.includes('airshow')) return 'Integrated Programme (IP)';
  return 'Other';
}

function loadApps(): Application[] {
  try {
    const s = localStorage.getItem('dsta_applications');
    if (!s) return seedApps as Application[];
    const stored = JSON.parse(s) as Application[];
    const ids = new Set(stored.map(a => a.id));
    const fresh = (seedApps as Application[]).filter(a => !ids.has(a.id));
    return fresh.length > 0 ? [...stored, ...fresh] : stored;
  } catch { return seedApps as Application[]; }
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 52, H = 20;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * W},${H - 2 - ((v - min) / range) * (H - 4)}`
  ).join(' ');
  const up = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? '#16a34a' : '#dc2626'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sub, iconCls, spark }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; iconCls: string; spark?: number[];
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconCls)}>
          <Icon size={16} />
        </div>
        {spark && <Sparkline values={spark} />}
      </div>
      <p className="text-[28px] font-bold text-fg leading-none mb-1">{value}</p>
      <p className="text-body-sm font-medium text-fg">{label}</p>
      {sub && <p className="text-[13px] text-fg-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Icon size={15} className="text-accent shrink-0" />
      <div>
        <p className="text-label-lg text-fg font-semibold">{title}</p>
        {sub && <p className="text-[13px] text-fg-muted">{sub}</p>}
      </div>
    </div>
  );
}

type Tab = 'applications' | 'projects' | 'talent' | 'feedback';

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: 'applications', label: 'Applications',   sub: 'Volume & trends'      },
  { id: 'projects',     label: 'Projects',        sub: 'Demand & utilisation' },
  { id: 'talent',       label: 'Talent Pipeline', sub: 'Conversion & depth'   },
  { id: 'feedback',     label: 'Intern Feedback', sub: 'Satisfaction & themes' },
];

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { role } = useRole();
  const router   = useRouter();
  const [apps,     setApps]     = useState<Application[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [activeCat,    setActiveCat]    = useState<Category | null>(null);
  const [activeTab,    setActiveTab]    = useState<Tab>('applications');
  const [aiSummary,    setAiSummary]    = useState<string>('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiGenerated,  setAiGenerated]  = useState(false);

  useEffect(() => {
    if (role !== 'io-admin' && role !== 'io') { router.replace('/dashboard'); return; }
    setApps(loadApps());
    setProjects(loadProjects());
  }, [role, router]);

  /* current cycle — 2026 real applications only (exclude historical APP-H records) */
  const cur = useMemo(() =>
    apps.filter(a => a.appliedDate.startsWith('2026') && !a.id.startsWith('APP-H')),
    [apps]
  );

  /* ── KPI stats ── */
  const kpi = useMemo(() => {
    const total     = cur.length;
    const extended  = cur.filter(a => ['Offer Extended','Offer Accepted','Active Intern','Internship Completed','Accepted'].includes(a.status)).length;
    const accepted  = cur.filter(a => ['Offer Accepted','Active Intern','Internship Completed','Accepted'].includes(a.status)).length;
    const returning = cur.filter(a => a.previousDSTA).length;
    const acceptRate   = extended > 0 ? Math.round((accepted / extended) * 100) : 0;
    const returningPct = total   > 0 ? Math.round((returning / total)   * 100) : 0;
    const totalSlots   = projects.reduce((s, p) => s + p.slots, 0);
    const totalMatched = projects.reduce((s, p) => s + p.matched, 0);
    const utilRate     = totalSlots > 0 ? Math.round((totalMatched / totalSlots) * 100) : 0;
    return { total, extended, accepted, returning, acceptRate, returningPct, totalSlots, totalMatched, utilRate };
  }, [cur, projects]);

  /* ── YoY chart ── */
  const chartYears = useMemo((): YearData[] => {
    const cats2026: Record<string, number> = {};
    for (const a of cur) {
      const c = mapCategory(a.programmeName);
      cats2026[c] = (cats2026[c] ?? 0) + 1;
    }
    return [
      ...HIST,
      { year: '2026*', cats: cats2026, acceptRate: kpi.acceptRate, utilRate: kpi.utilRate, current: true },
    ];
  }, [cur, kpi.acceptRate, kpi.utilRate]);

  const chartMax = useMemo(() =>
    Math.max(...chartYears.map(y => Object.values(y.cats).reduce((s: number, v) => s + v, 0))),
    [chartYears]
  );

  /* ── PC utilisation ── */
  const pcStats = useMemo(() => {
    const map: Record<string, { slots: number; matched: number; count: number }> = {};
    for (const p of projects) {
      const pc = p.pc ?? 'Unknown';
      if (!map[pc]) map[pc] = { slots: 0, matched: 0, count: 0 };
      map[pc].slots   += p.slots;
      map[pc].matched += p.matched;
      map[pc].count++;
    }
    return Object.entries(map)
      .map(([pc, v]) => ({ pc, ...v, pct: v.slots > 0 ? Math.round((v.matched / v.slots) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [projects]);

  /* ── Project demand ── */
  const projectDemand = useMemo(() => {
    const pref: Record<string, { total: number; first: number }> = {};
    for (const a of apps) {
      a.projectRankings.forEach((pid, i) => {
        if (!pref[pid]) pref[pid] = { total: 0, first: 0 };
        pref[pid].total++;
        if (i === 0) pref[pid].first++;
      });
    }
    return projects
      .map(p => ({
        id: p.id, title: p.title, slots: p.slots,
        prefs: pref[p.id]?.total ?? 0,
        first: pref[p.id]?.first ?? 0,
        techDomain: p.techDomain ?? '—',
      }))
      .sort((a, b) => b.prefs - a.prefs)
      .slice(0, 8);
  }, [apps, projects]);
  const prefMax = Math.max(...projectDemand.map(p => p.prefs), 1);

  /* ── Tech domain demand ── */
  const domainDemand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of apps) {
      for (const pid of a.projectRankings) {
        const proj = projects.find(p => p.id === pid);
        if (proj?.techDomain) map[proj.techDomain] = (map[proj.techDomain] ?? 0) + 1;
      }
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .map(([domain, count]) => ({ domain, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [apps, projects]);
  const domainMax = Math.max(...domainDemand.map(d => d.count), 1);

  /* ── School breakdown ── */
  const schoolBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of cur) map[a.school] = (map[a.school] ?? 0) + 1;
    const total = cur.length || 1;
    return Object.entries(map)
      .map(([school, count]) => ({ school, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [cur]);
  const schoolMax = Math.max(...schoolBreakdown.map(s => s.count), 1);

  /* ── Feedback data ── */
  const feedbackApps = apps.filter(a => a.status === 'Internship Completed' && !!a.internFeedback);
  const feedbackCount = feedbackApps.length;
  const completedCount = apps.filter(a => a.status === 'Internship Completed').length;
  const responseRate = completedCount > 0 ? Math.round((feedbackCount / completedCount) * 100) : 0;

  const FEEDBACK_DIMS = [
    { key: 'calibration' as const, label: 'Programme Calibration', desc: 'Project scope vs. learning level' },
    { key: 'sentiment'   as const, label: 'Overall Sentiment',     desc: 'Experience vs. expectations'      },
    { key: 'mentorship'  as const, label: 'Mentorship Quality',    desc: 'Effectiveness of guidance'        },
    { key: 'environment' as const, label: 'Work Environment',      desc: 'Team culture sentiment'           },
  ];

  const dimAverages = FEEDBACK_DIMS.map(({ key, label, desc }) => {
    const vals = feedbackApps.map(a => a.internFeedback!.ratings[key]).filter(v => v > 0);
    const avg  = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return { key, label, desc, avg: Math.round(avg * 10) / 10 };
  });

  const overallAvg = dimAverages.length > 0
    ? Math.round((dimAverages.reduce((s, d) => s + d.avg, 0) / dimAverages.length) * 10) / 10
    : 0;

  /* Calibration — scope-fit distribution (project-level mis-calibration signal) */
  const scopeFitCounts = {
    'too-easy':   feedbackApps.filter(a => a.internFeedback!.scopeFit === 'too-easy').length,
    'just-right': feedbackApps.filter(a => a.internFeedback!.scopeFit === 'just-right').length,
    'too-hard':   feedbackApps.filter(a => a.internFeedback!.scopeFit === 'too-hard').length,
  };
  const calibratedPct = feedbackCount > 0 ? Math.round((scopeFitCounts['just-right'] / feedbackCount) * 100) : 0;

  /* Overall sentiment — eNPS from 0–10 recommend scores */
  const recommendScores = feedbackApps.map(a => a.internFeedback!.recommend).filter(v => v !== undefined);
  const promoters  = recommendScores.filter(v => v >= 9).length;
  const passives   = recommendScores.filter(v => v >= 7 && v <= 8).length;
  const detractors = recommendScores.filter(v => v <= 6).length;
  const nps = recommendScores.length > 0
    ? Math.round(((promoters - detractors) / recommendScores.length) * 100)
    : 0;

  const highlights   = feedbackApps.map(a => a.internFeedback!.highlights).filter(Boolean);
  const improvements = feedbackApps.map(a => a.internFeedback!.improvements).filter(Boolean);

  async function generateAiSummary() {
    if (feedbackCount === 0) return;
    setAiLoading(true);
    setAiSummary('');
    try {
      const prompt = `You are an HR analyst reviewing post-internship feedback for DSTA. Write a concise, professional summary (3–4 short paragraphs) structured around these four areas:\n1. PROGRAMME CALIBRATION — is project scope pitched at the right level for optimal learning? Use the calibration rating and the scope-fit distribution to flag if projects skew too easy or too hard.\n2. OVERALL SENTIMENT — how interns feel about the programme overall, referencing the sentiment rating and eNPS.\n3. MENTORSHIP — effectiveness and quality of mentor guidance.\n4. WORK ENVIRONMENT — sentiment about team culture and workplace.\nEnd with 1–2 actionable recommendations for the programme team.\n\nQuantitative signals:\n- Programme Calibration: ${dimAverages[0]?.avg}/5 (scope-fit: ${scopeFitCounts['too-easy']} too easy, ${scopeFitCounts['just-right']} just right, ${scopeFitCounts['too-hard']} too challenging; ${calibratedPct}% well-calibrated)\n- Overall Sentiment: ${dimAverages[1]?.avg}/5, eNPS ${nps} (${promoters} promoters, ${passives} passives, ${detractors} detractors)\n- Mentorship Quality: ${dimAverages[2]?.avg}/5\n- Work Environment: ${dimAverages[3]?.avg}/5\n\nPositive highlights (${highlights.length} responses):\n${highlights.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nAreas for improvement (${improvements.length} responses):\n${improvements.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok || !res.body) throw new Error('API error');
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAiSummary(full);
      }
      setAiGenerated(true);
    } catch {
      setAiSummary('Unable to generate summary. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  if (role !== 'io-admin' && role !== 'io') return null;

  const CHART_H = 192;

  return (
    <Shell activeRoute="/analytics">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <BarChart2 size={22} className="text-accent" />
          <h1 className="text-headline-lg text-fg">Analytics</h1>
        </div>
      </div>

      {/* ── KPI strip (always visible) ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users}        label="Applications (2026 cycle)" value={kpi.total}
          sub="Current cycle in progress"
          iconCls="bg-accent/10 text-accent" />
        <StatCard icon={CheckCircle2} label="Offer Acceptance Rate"     value={`${kpi.acceptRate}%`}
          sub={`${kpi.accepted} of ${kpi.extended} offers accepted`}
          iconCls="bg-success-bg text-success"
          spark={[...HIST.map(y => y.acceptRate), kpi.acceptRate]} />
        <StatCard icon={Target}       label="Slot Utilisation"          value={`${kpi.utilRate}%`}
          sub={`${kpi.totalMatched} of ${kpi.totalSlots} slots filled`}
          iconCls="bg-warning-bg text-warning"
          spark={[...HIST.map(y => y.utilRate), kpi.utilRate]} />
        <StatCard icon={RefreshCw}    label="Returning Candidates"      value={kpi.returning}
          sub={`${kpi.returningPct}% with prior DSTA engagement`}
          iconCls="bg-accent/5 text-accent" />
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-body-sm font-semibold transition-colors border-b-2 -mb-px',
              activeTab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-fg-muted hover:text-fg hover:border-border-strong'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ Tab: Applications ════════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <div className="flex flex-col gap-5">

          {/* YoY bar chart */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <SectionHead icon={BarChart2} title="Application Volume — Year on Year"
                sub="Total applications per cohort, stacked by internship category" />
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveCat(null)}
                  className={cn('px-2.5 py-1 rounded-full text-[13px] font-semibold border transition-colors',
                    activeCat === null
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-fg-muted border-border hover:border-accent/40'
                  )}
                >All</button>
                {CATEGORIES.map(cat => (
                  <button key={cat}
                    onClick={() => setActiveCat(activeCat === cat ? null : cat)}
                    style={activeCat === cat ? { backgroundColor: CAT_COLOR[cat], borderColor: CAT_COLOR[cat] } : {}}
                    className={cn('px-2.5 py-1 rounded-full text-[13px] font-semibold border transition-colors',
                      activeCat === cat ? 'text-white' : 'bg-surface text-fg-muted border-border hover:border-accent/40'
                    )}
                  >{cat}</button>
                ))}
              </div>
            </div>

            {/* Count labels */}
            <div className="flex gap-3 mb-1">
              {chartYears.map(({ year, cats }) => {
                const total = activeCat
                  ? (cats[activeCat] ?? 0)
                  : Object.values(cats).reduce((s: number, v) => s + v, 0);
                return <div key={year} className="flex-1 text-center text-[12px] text-fg-muted">{total || ''}</div>;
              })}
            </div>

            {/* Bars */}
            <div className="flex items-end gap-3" style={{ height: CHART_H }}>
              {chartYears.map(({ year, cats, current }) => {
                const total = activeCat
                  ? (cats[activeCat] ?? 0)
                  : Object.values(cats).reduce((s: number, v) => s + v, 0);
                const barH = chartMax > 0 ? Math.max(2, Math.round((total / chartMax) * CHART_H)) : 2;
                const catsToRender: string[] = activeCat ? [activeCat] : [...CATEGORIES];
                return (
                  <div key={year} className="flex-1 flex items-end" style={{ height: CHART_H }}>
                    <div className={cn('w-full rounded-t overflow-hidden', current && 'opacity-75')} style={{ height: barH }}>
                      {catsToRender.map(cat => {
                        const count = cats[cat] ?? 0;
                        if (!count) return null;
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return <div key={cat} style={{ height: `${pct}%`, backgroundColor: CAT_COLOR[cat as Category] }} title={`${cat}: ${count}`} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex gap-3 mt-2">
              {chartYears.map(({ year, current }) => (
                <div key={year} className="flex-1 text-center">
                  <span className={cn('text-[13px] font-medium', current ? 'text-accent' : 'text-fg-muted')}>{year}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border">
              {(activeCat ? [activeCat] : CATEGORIES).map(cat => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CAT_COLOR[cat] }} />
                  <span className="text-[13px] text-fg-muted">{cat}</span>
                </div>
              ))}
              <span className="text-[13px] text-fg-subtle ml-auto">* 2026 is the current in-progress cycle</span>
            </div>
          </div>

          {/* School breakdown */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionHead icon={GraduationCap} title="Applicants by Institution" sub="2026 cycle" />
            <div className="space-y-2">
              {schoolBreakdown.map(({ school, count, pct }) => (
                <div key={school} className="flex items-center gap-3">
                  <div className="w-20 shrink-0 text-[13px] text-fg-muted text-right truncate">{school}</div>
                  <div className="flex-1 h-7 bg-bg-subtle rounded-lg overflow-hidden relative">
                    <div className="h-full rounded-lg bg-accent/50 transition-all"
                      style={{ width: `${Math.max(4, (count / schoolMax) * 100)}%` }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-fg">{count}</span>
                  </div>
                  <div className="w-8 shrink-0 text-[13px] text-fg-muted text-right">{pct}%</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ══ Tab: Projects ════════════════════════════════════════════════ */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Project Demand */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionHead icon={Briefcase} title="Project Demand"
              sub="Appearances in applicant preference lists — all applications" />
            {projectDemand.length === 0 ? (
              <p className="text-body-sm text-fg-muted">No preference data yet.</p>
            ) : (
              <div className="space-y-3">
                {projectDemand.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-fg-subtle w-4 shrink-0 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-body-sm text-fg truncate flex-1 pr-2" title={p.title}>{p.title}</p>
                        <div className="flex items-center gap-3 shrink-0 text-[13px]">
                          <span className="text-fg-muted">{p.first} first choice</span>
                          <span className="font-bold text-fg">{p.prefs}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent/70" style={{ width: `${(p.prefs / prefMax) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-[12px] text-fg-subtle pt-1 border-t border-border mt-2">
                  Count = total appearances across all applicant ranking lists. "First choice" = ranked #1.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-5">

            {/* Tech Domain Interest */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <SectionHead icon={BarChart2} title="Technology Domain Interest"
                sub="Which domains attract the most applicant interest" />
              <div className="space-y-2.5">
                {domainDemand.map(({ domain, count, pct }) => (
                  <div key={domain} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[13px] text-fg truncate">{domain}</p>
                        <span className="text-[13px] font-bold text-fg ml-2 shrink-0">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent/60" style={{ width: `${(count / domainMax) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PC Utilisation */}
            <div className="bg-surface border border-border rounded-2xl p-5">
              <SectionHead icon={Building2} title="Utilisation by Programme Centre"
                sub="Intern slots filled vs allocated — current project list" />
              {pcStats.length === 0 ? (
                <p className="text-body-sm text-fg-muted">No project data available.</p>
              ) : (
                <div className="space-y-4">
                  {pcStats.map(({ pc, slots, matched, count, pct }) => (
                    <div key={pc}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="text-body-sm font-medium text-fg">{pc}</span>
                          <span className="text-[13px] text-fg-muted ml-2">{count} project{count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[13px] text-fg-muted">{matched}/{slots}</span>
                          <span className={cn('text-[12px] font-bold w-9 text-right',
                            pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'
                          )}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all',
                          pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger'
                        )} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: 'Total slots',  val: kpi.totalSlots,    cls: 'text-fg'      },
                      { label: 'Filled',        val: kpi.totalMatched,  cls: 'text-success' },
                      { label: 'Overall util',  val: `${kpi.utilRate}%`, cls: 'text-fg'     },
                    ].map(m => (
                      <div key={m.label}>
                        <p className={cn('text-[20px] font-bold leading-none mb-0.5', m.cls)}>{m.val}</p>
                        <p className="text-[12px] text-fg-muted">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ══ Tab: Talent Pipeline ════════════════════════════════════════ */}
      {activeTab === 'talent' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Conversion pipeline */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionHead icon={TrendingUp} title="Talent Conversion Pipeline"
              sub="How interns progress to deeper DSTA engagement (2022–2024 cohorts)" />
            <div className="space-y-2">
              {TALENT_PIPELINE.map((stage, i) => (
                <div key={i}>
                  <div className={cn(
                    'flex items-center justify-between px-4 py-3 rounded-xl border',
                    i === 0 ? 'bg-accent/5 border-accent/20' : 'bg-bg-subtle border-border'
                  )}>
                    <p className="text-body-sm text-fg pr-3">{stage.label}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-[12px] font-semibold px-1.5 py-0.5 rounded-full',
                        i === 0 ? 'bg-accent/10 text-accent' : 'bg-success-bg text-success'
                      )}>{stage.pct}%</span>
                      <span className="text-[20px] font-bold text-fg leading-none">{stage.count}</span>
                    </div>
                  </div>
                  {i < TALENT_PIPELINE.length - 1 && (
                    <div className="flex items-center gap-2 py-1 pl-5">
                      <div className="w-px h-3 bg-border-strong" />
                      <span className="text-[12px] text-fg-subtle">
                        {Math.round((TALENT_PIPELINE[i + 1].count / TALENT_PIPELINE[i].count) * 100)}% proceed to next stage
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2026 signals */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionHead icon={RefreshCw} title="2026 Cycle Signals"
              sub="Live indicators from the current internship cycle" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Offer acceptance',   value: `${kpi.acceptRate}%`,    icon: CheckCircle2, cls: 'bg-success-bg text-success' },
                { label: 'Returning candidates', value: `${kpi.returningPct}%`, icon: RefreshCw,    cls: 'bg-accent/10 text-accent'   },
                { label: 'Active interns',       value: cur.filter(a => a.status === 'Active Intern').length,        icon: Users,  cls: 'bg-accent/10 text-accent'   },
                { label: 'Cycle completions',    value: cur.filter(a => a.status === 'Internship Completed').length, icon: Target, cls: 'bg-success-bg text-success' },
              ].map(m => (
                <div key={m.label} className="flex flex-col gap-2 px-4 py-4 bg-bg-subtle rounded-2xl">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', m.cls)}>
                    <m.icon size={15} />
                  </div>
                  <p className="text-[26px] font-bold text-fg leading-none">{m.value}</p>
                  <p className="text-[13px] text-fg-muted">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-label-sm text-fg mb-3">Historical benchmarks (2022–2025 avg)</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Avg acceptance rate', value: `${Math.round(HIST.reduce((s, y) => s + y.acceptRate, 0) / HIST.length)}%` },
                  { label: 'Avg slot utilisation', value: `${Math.round(HIST.reduce((s, y) => s + y.utilRate, 0) / HIST.length)}%` },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between px-3 py-2 rounded-xl border border-border">
                    <span className="text-body-sm text-fg-muted">{m.label}</span>
                    <span className="text-body-sm font-bold text-fg">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ══ Tab: Intern Feedback ═══════════════════════════════════════ */}
      {activeTab === 'feedback' && (
        <div className="flex flex-col gap-5">

          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Responses received',  value: feedbackCount, sub: `${responseRate}% response rate`, icon: MessageSquare, cls: 'bg-accent/10 text-accent'   },
              { label: 'Overall satisfaction', value: feedbackCount > 0 ? `${overallAvg}/5` : '—', sub: 'Mean across 4 dimensions', icon: Star, cls: 'bg-warning-bg text-warning' },
              { label: 'eNPS',                 value: feedbackCount > 0 ? (nps > 0 ? `+${nps}` : `${nps}`) : '—', sub: `${promoters} promoters · ${detractors} detractors`, icon: TrendingUp, cls: 'bg-success-bg text-success' },
              { label: 'Well-calibrated',      value: feedbackCount > 0 ? `${calibratedPct}%`  : '—', sub: 'Project scope "just right"', icon: Target, cls: 'bg-accent/5 text-accent' },
            ].map(m => (
              <div key={m.label} className="bg-surface border border-border rounded-2xl p-5">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', m.cls)}>
                  <m.icon size={16} />
                </div>
                <p className="text-[28px] font-bold text-fg leading-none mb-1">{m.value}</p>
                <p className="text-body-sm font-medium text-fg">{m.label}</p>
                <p className="text-[12px] text-fg-muted mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Rating breakdown — the 4 analytics dimensions */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <BarChart2 size={15} className="text-accent shrink-0" />
              <div>
                <p className="text-label-lg text-fg font-semibold">Feedback Dimensions</p>
                <p className="text-[13px] text-fg-muted">Average score per dimension across all intern feedback</p>
              </div>
            </div>
            {feedbackCount === 0 ? (
              <p className="text-body-sm text-fg-muted italic">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-4">
                {dimAverages.map(({ label, desc, avg }) => (
                  <div key={label}>
                    <div className="flex items-end justify-between mb-1.5">
                      <div>
                        <span className="text-body-sm font-medium text-fg">{label}</span>
                        <span className="text-[12px] text-fg-muted ml-2">{desc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} size={13}
                              className={avg >= n ? 'text-warning fill-warning' : avg >= n - 0.5 ? 'text-warning fill-warning/40' : 'text-border'} />
                          ))}
                        </div>
                        <span className="text-body-sm font-bold text-fg w-8 text-right">{avg}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${(avg / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-body-sm text-fg-muted">Overall average</span>
                  <span className="text-[20px] font-bold text-fg">{overallAvg}<span className="text-body-sm text-fg-muted font-normal">/5</span></span>
                </div>
              </div>
            )}
          </div>

          {/* Calibration + Sentiment detail */}
          {feedbackCount > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Programme calibration — scope-fit distribution */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <Target size={15} className="text-accent shrink-0" />
                  <div>
                    <p className="text-label-lg text-fg font-semibold">Programme Calibration</p>
                    <p className="text-[13px] text-fg-muted">Is project scope pitched for optimal learning?</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {([
                    { key: 'too-easy'   as const, label: 'Too easy',        cls: 'bg-warning'  },
                    { key: 'just-right' as const, label: 'Just right',      cls: 'bg-success'  },
                    { key: 'too-hard'   as const, label: 'Too challenging', cls: 'bg-danger'   },
                  ]).map(({ key, label, cls }) => {
                    const count = scopeFitCounts[key];
                    const pct   = feedbackCount > 0 ? Math.round((count / feedbackCount) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-body-sm text-fg">{label}</span>
                          <span className="text-body-sm font-bold text-fg tabular-nums">{count} <span className="text-fg-muted font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-bg-subtle rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all', cls)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 px-3 py-2.5 bg-bg-subtle rounded-xl">
                  <p className="text-[13px] text-fg-muted">
                    {calibratedPct >= 70
                      ? `Well calibrated — ${calibratedPct}% of interns found their project scope appropriate.`
                      : scopeFitCounts['too-hard'] > scopeFitCounts['too-easy']
                        ? `Projects skew too challenging — consider narrowing scope for this cohort level.`
                        : `Projects skew too easy — consider adding stretch goals to raise the learning ceiling.`}
                  </p>
                </div>
              </div>

              {/* Overall sentiment — eNPS breakdown */}
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <TrendingUp size={15} className="text-success shrink-0" />
                  <div>
                    <p className="text-label-lg text-fg font-semibold">Overall Sentiment (eNPS)</p>
                    <p className="text-[13px] text-fg-muted">Likelihood to recommend a DSTA internship</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-[36px] font-bold text-fg leading-none">{nps > 0 ? `+${nps}` : nps}</span>
                  <span className="text-body-sm text-fg-muted">eNPS score</span>
                </div>
                {/* Stacked bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-3">
                  {[
                    { n: promoters,  cls: 'bg-success' },
                    { n: passives,   cls: 'bg-warning' },
                    { n: detractors, cls: 'bg-danger'  },
                  ].map((s, i) => s.n > 0 && (
                    <div key={i} className={s.cls} style={{ width: `${(s.n / recommendScores.length) * 100}%` }} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Promoters',  sub: '9–10', n: promoters,  cls: 'text-success' },
                    { label: 'Passives',   sub: '7–8',  n: passives,   cls: 'text-warning' },
                    { label: 'Detractors', sub: '0–6',  n: detractors, cls: 'text-danger'  },
                  ].map(s => (
                    <div key={s.label} className="px-2 py-2 bg-bg-subtle rounded-xl">
                      <p className={cn('text-[20px] font-bold leading-none', s.cls)}>{s.n}</p>
                      <p className="text-[12px] text-fg font-medium mt-1">{s.label}</p>
                      <p className="text-[11px] text-fg-subtle">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Highlights + Improvements */}
          {feedbackCount > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp size={14} className="text-success shrink-0" />
                  <p className="text-label-lg text-fg font-semibold">Highlights</p>
                  <span className="text-[12px] text-fg-muted ml-auto">{highlights.length} response{highlights.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {highlights.length === 0
                    ? <p className="text-body-sm text-fg-muted italic">None recorded.</p>
                    : highlights.map((h, i) => (
                      <div key={i} className="px-3 py-2.5 bg-success-bg/40 border border-success/15 rounded-xl">
                        <p className="text-body-sm text-fg leading-relaxed">"{h}"</p>
                      </div>
                    ))
                  }
                </div>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={14} className="text-warning shrink-0" />
                  <p className="text-label-lg text-fg font-semibold">Areas for Improvement</p>
                  <span className="text-[12px] text-fg-muted ml-auto">{improvements.length} response{improvements.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {improvements.length === 0
                    ? <p className="text-body-sm text-fg-muted italic">None recorded.</p>
                    : improvements.map((h, i) => (
                      <div key={i} className="px-3 py-2.5 bg-warning-bg/40 border border-warning/15 rounded-xl">
                        <p className="text-body-sm text-fg leading-relaxed">"{h}"</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* AI Insight */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <AiSparkleIcon size={16} />
                <div>
                  <p className="text-label-lg text-fg font-semibold">AI Insight</p>
                  <p className="text-[13px] text-fg-muted">Qualitative summary generated from intern free-text responses</p>
                </div>
              </div>
              <button
                onClick={() => { setAiGenerated(false); generateAiSummary(); }}
                disabled={aiLoading || feedbackCount === 0}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-body-sm font-semibold border transition-colors shrink-0',
                  aiLoading || feedbackCount === 0
                    ? 'border-border text-fg-muted bg-bg-subtle cursor-not-allowed'
                    : 'border-accent/30 text-accent bg-accent/5 hover:bg-accent/10'
                )}
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <AiSparkleIcon size={14} />}
                {aiLoading ? 'Generating…' : aiGenerated ? 'Regenerate' : 'Generate Summary'}
              </button>
            </div>

            {feedbackCount === 0 ? (
              <p className="text-body-sm text-fg-muted italic">No feedback available yet to analyse.</p>
            ) : aiSummary ? (
              <div className="bg-accent/3 border border-accent/15 rounded-xl px-4 py-4">
                <p className="text-body-sm text-fg leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
              </div>
            ) : (
              <div className="px-4 py-8 text-center border border-dashed border-border rounded-xl">
                <AiSparkleIcon size={22} className="mx-auto mb-2 opacity-40" />
                <p className="text-body-sm text-fg-muted">Click "Generate Summary" to analyse {feedbackCount} feedback response{feedbackCount !== 1 ? 's' : ''} with AI.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </Shell>
  );
}
