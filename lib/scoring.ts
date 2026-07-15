import type { Application, ProjectEntry, SuitabilityScore } from './types';

/* ── Availability match (TOA-027/078) ────────────────────────────────────
   Soft, non-blocking checks the IO sees before shortlisting: does the applicant's
   available duration meet the project's minimum, and does their window avoid the
   mentor's blackout periods? Returns human-readable warnings (empty = clean). */
export function availabilityWarnings(app: Application, project: ProjectEntry): string[] {
  const out: string[] = [];
  const avail = app.availability;
  if (!avail) return out;
  if (project.minDurationWeeks != null && avail.weeks != null && avail.weeks < project.minDurationWeeks) {
    out.push(`Available ${avail.weeks} wk — project needs ≥ ${project.minDurationWeeks} wk`);
  }
  if (project.blackoutPeriods?.length && avail.from && avail.to) {
    const af = new Date(avail.from).getTime();
    const at = new Date(avail.to).getTime();
    for (const b of project.blackoutPeriods) {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      if (!Number.isNaN(af) && !Number.isNaN(at) && !Number.isNaN(bs) && !Number.isNaN(be) && af <= be && bs <= at) {
        out.push(`Overlaps mentor blackout (${b.start} – ${b.end})`);
        break;
      }
    }
  }
  return out;
}

/* ── Weight management ───────────────────────────────────────────────── */

export interface ScoringWeights {
  discipline: number; // 0–100
  skills:     number; // 0–100
  standing:   number; // 0–100 (academic standing)
}

export const DEFAULT_WEIGHTS: ScoringWeights = { discipline: 50, skills: 30, standing: 20 };
export const WEIGHTS_KEY = 'dsta_scoring_weights';

export function loadWeights(): ScoringWeights {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    if (raw) {
      const w = JSON.parse(raw) as Partial<ScoringWeights>;
      // migrate old 2-factor weights → new 3-factor default
      if (typeof w.discipline === 'number' && typeof w.skills === 'number' && typeof w.standing === 'number') {
        return { discipline: w.discipline, skills: w.skills, standing: w.standing };
      }
    }
  } catch {}
  return { ...DEFAULT_WEIGHTS };
}

export function saveWeights(w: ScoringWeights): void {
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w));
}

/* ── Discipline scoring (tertiary: discipline-vs-discipline) ──────────── */

const DISCIPLINE_RELATED: Record<string, string[]> = {
  'computer science':          ['software engineering', 'computer engineering', 'computing', 'information technology', 'cybersecurity', 'artificial intelligence', 'data science', 'information systems'],
  'computer engineering':      ['electrical engineering', 'computer science', 'computing', 'software engineering', 'systems engineering', 'electronic engineering'],
  'electrical engineering':    ['computer engineering', 'electronic engineering', 'systems engineering', 'signal processing', 'robotics', 'mechatronics'],
  'mechanical engineering':    ['aerospace engineering', 'systems engineering', 'robotics', 'mechatronics', 'industrial engineering'],
  'aerospace engineering':     ['mechanical engineering', 'systems engineering', 'robotics', 'electrical engineering'],
  'information systems':       ['computer science', 'business analytics', 'data science', 'information technology', 'software engineering'],
  'information technology':    ['computer science', 'computing', 'information systems', 'software engineering', 'cybersecurity'],
  'data science':              ['computer science', 'mathematics', 'statistics', 'business analytics', 'information systems'],
  'data science and analytics':['computer science', 'mathematics', 'statistics', 'business analytics', 'information systems'],
  'business analytics':        ['data science', 'information systems', 'mathematics', 'statistics'],
  'mathematics':               ['statistics', 'data science', 'applied mathematics', 'computational mathematics', 'operations research'],
  'operations research':       ['mathematics', 'statistics', 'data science', 'computer science'],
  'statistics':                ['mathematics', 'data science', 'business analytics'],
  'cybersecurity':             ['computer science', 'information technology', 'computer engineering', 'networking'],
  'biomedical engineering':    ['biology', 'electrical engineering', 'mechanical engineering'],
};

export function calcDisciplineScore(course: string, discipline: string): number {
  const c = course.toLowerCase().trim();
  const d = discipline.toLowerCase().trim();
  if (!d) return 50;
  if (c === d) return 100;
  if (c.includes(d) || d.includes(c)) return 88;
  for (const [key, related] of Object.entries(DISCIPLINE_RELATED)) {
    if (c.includes(key) && related.some(r => d.includes(r))) return 82;
    if (d.includes(key) && related.some(r => c.includes(r))) return 82;
  }
  const stop = new Set(['of', 'and', 'in', 'for', 'the', 'a', 'an']);
  const cW = c.split(/[\s,&/]+/).filter(w => w.length > 2 && !stop.has(w));
  const dW = d.split(/[\s,&/]+/).filter(w => w.length > 2 && !stop.has(w));
  const overlap = cW.filter(w => dW.some(dw => dw.includes(w) || w.includes(dw))).length;
  if (overlap >= 2) return 60;
  if (overlap === 1) return 42;
  return 18;
}

/* ── Subject ↔ discipline dictionary (subject-based tracks) ───────────── */
/* Maps each discipline a project may ask for → its underpinning subjects.   */
/* DSTA-admin maintained in the real build; seeded here.                     */
export const STANDING_BANDS: { label: string; score: number; from: string }[] = [
  { label: 'Top',        score: 100, from: 'top of cohort (≥ 85% of scale)' },
  { label: 'Strong',     score: 80,  from: '70–84% of scale' },
  { label: 'Solid',      score: 60,  from: '55–69% of scale' },
  { label: 'Borderline', score: 40,  from: 'below 55% of scale' },
];

export const DISCIPLINE_SUBJECTS: Record<string, { subject: string; weight: number }[]> = {
  'computer science':       [{ subject: 'mathematics', weight: 1.0 }, { subject: 'computing', weight: 1.0 }, { subject: 'physics', weight: 0.5 }],
  'mathematics':            [{ subject: 'mathematics', weight: 1.0 }, { subject: 'further mathematics', weight: 0.8 }, { subject: 'physics', weight: 0.4 }],
  'operations research':    [{ subject: 'mathematics', weight: 1.0 }, { subject: 'computing', weight: 0.6 }, { subject: 'economics', weight: 0.5 }],
  'electrical engineering': [{ subject: 'physics', weight: 1.0 }, { subject: 'mathematics', weight: 1.0 }],
  'mechanical engineering': [{ subject: 'physics', weight: 1.0 }, { subject: 'mathematics', weight: 1.0 }],
  'information technology':  [{ subject: 'computing', weight: 1.0 }, { subject: 'mathematics', weight: 0.7 }],
  'data science':           [{ subject: 'mathematics', weight: 1.0 }, { subject: 'computing', weight: 0.8 }],
  'biomedical engineering': [{ subject: 'biology', weight: 1.0 }, { subject: 'chemistry', weight: 1.0 }, { subject: 'mathematics', weight: 0.5 }],
};

const SUBJECT_SKILLS: Record<string, string[]> = {
  computing:    ['python', 'programming', 'algorithms', 'software', 'data analysis', 'simulation'],
  mathematics:  ['matlab', 'statistics', 'data analysis', 'modelling', 'python', 'simulation'],
  physics:      ['matlab', 'simulation', 'data analysis', 'signal processing'],
  economics:    ['data analysis', 'statistics'],
  chemistry:    ['data analysis'],
  biology:      ['data analysis'],
};

/* grade → 0–1 ratio, normalised WITHIN the applicant's own system */
function gradeRatio(track: string, grade: string, level?: string): number {
  const g = (grade ?? '').trim().toUpperCase();
  let r: number;
  if (track === 'IB') {
    const n = parseInt(g, 10);
    r = isNaN(n) ? 0 : Math.max(0, Math.min(1, n / 7));
  } else {
    const map: Record<string, number> = { 'A': 1, 'B': 0.8, 'C': 0.6, 'D': 0.45, 'E': 0.3, 'S': 0.4, 'U': 0, 'F': 0 };
    if (map[g] != null) r = map[g];
    else { const num = parseFloat(g); r = isNaN(num) ? 0 : Math.max(0, Math.min(1, num / 7)); }
  }
  if (level && /(h1|sl)/i.test(level)) r *= 0.85;  // lighter level counts slightly less
  return r;
}

function band(ratio: number): { score: number; label: string } {
  if (ratio >= 0.85) return { score: 100, label: 'Top' };
  if (ratio >= 0.70) return { score: 80,  label: 'Strong' };
  if (ratio >= 0.55) return { score: 60,  label: 'Solid' };
  return { score: 40, label: 'Borderline' };
}

/* Academic standing → within-track band. Returns null if no usable grades. */
export function calcStandingScore(app: Application): { score: number; label: string } | null {
  const track = app.track ?? '';
  if (app.subjects && app.subjects.length) {
    const ratios = app.subjects
      .map(s => gradeRatio(track, s.grade, s.level))
      .sort((a, b) => b - a)
      .slice(0, 4);
    if (!ratios.length) return null;
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return band(avg);
  }
  if (app.gpa && app.gpa > 0) {
    const scale = track === 'Polytechnic' ? 4 : 5;  // poly /4, uni & NUS High /5
    return band(app.gpa / scale);
  }
  return null;
}

/* Discipline-fit for subject-based applicants, via the dictionary. null = no mapping. */
export function calcDisciplineFitFromSubjects(app: Application, discipline: string): number | null {
  if (!app.subjects || !app.subjects.length) return null;
  const disc = (discipline ?? '').toLowerCase();
  const wanted = new Map<string, number>();
  for (const [key, subs] of Object.entries(DISCIPLINE_SUBJECTS)) {
    if (disc.includes(key)) for (const r of subs) wanted.set(r.subject, Math.max(wanted.get(r.subject) ?? 0, r.weight));
  }
  if (!wanted.size) return null;  // discipline not mapped → caller drops the factor
  let got = 0, total = 0;
  Array.from(wanted.entries()).forEach(([subj, w]) => {
    total += w;
    // TOA-067 — a subject can appear under several labels (e.g. "Mathematics 1",
    // "Mathematics 2", "Advanced Mathematics"). Match ALL variants on the stem and
    // count the best grade, rather than whichever happens to be listed first.
    const matches = app.subjects!.filter(s => s.name.toLowerCase().includes(subj));
    if (matches.length) {
      const best = Math.max(...matches.map(s => gradeRatio(app.track ?? '', s.grade, s.level)));
      got += w * (0.62 + 0.38 * best);
    }
  });
  return total === 0 ? null : Math.round(Math.min(100, (got / total) * 100));
}

/* ── Skills scoring ──────────────────────────────────────────────────── */

const COURSE_SKILLS: Record<string, string[]> = {
  'computer science':          ['python', 'java', 'c++', 'algorithms', 'machine learning', 'ai', 'databases', 'sql', 'software', 'networking', 'cybersecurity', 'data structures'],
  'computer engineering':      ['c', 'c++', 'embedded', 'hardware', 'fpga', 'python', 'signal processing', 'networking', 'microcontrollers', 'verilog'],
  'electrical engineering':    ['circuits', 'signal processing', 'matlab', 'hardware', 'power systems', 'control systems', 'embedded', 'sensors', 'pcb'],
  'mechanical engineering':    ['cad', 'solidworks', 'matlab', 'simulation', 'design', 'manufacturing', 'fluid dynamics', 'thermodynamics'],
  'aerospace engineering':     ['cad', 'matlab', 'simulation', 'fluid dynamics', 'propulsion', 'structural analysis', 'python'],
  'information systems':       ['sql', 'databases', 'erp', 'business analysis', 'python', 'system design', 'data modelling'],
  'data science':              ['python', 'r', 'machine learning', 'statistics', 'data analysis', 'sql', 'visualisation', 'deep learning', 'tensorflow', 'pytorch'],
  'data science and analytics':['python', 'r', 'machine learning', 'statistics', 'data analysis', 'sql', 'visualisation', 'deep learning'],
  'business analytics':        ['sql', 'python', 'r', 'statistics', 'tableau', 'excel', 'visualisation', 'power bi'],
  'mathematics':               ['python', 'matlab', 'r', 'statistics', 'optimisation', 'linear algebra', 'numerical methods'],
  'statistics':                ['r', 'python', 'matlab', 'statistics', 'probability', 'modelling'],
  'cybersecurity':             ['python', 'networking', 'cryptography', 'security', 'linux', 'firewalls', 'penetration testing'],
  'biomedical engineering':    ['matlab', 'python', 'signal processing', 'medical imaging', 'biology', 'sensors'],
  'information technology':    ['networking', 'sql', 'python', 'system administration', 'cybersecurity', 'cloud', 'linux', 'data analysis'],
  'software engineering':      ['python', 'java', 'c++', 'software', 'agile', 'testing', 'databases', 'sql', 'algorithms'],
};

function inferSkills(app: Application): string[] {
  const c = app.course.toLowerCase();
  for (const [key, skills] of Object.entries(COURSE_SKILLS)) {
    if (c.includes(key) || key.split(' ').some(kw => kw.length > 4 && c.includes(kw))) return [...skills];
  }
  // subject-based fallback: infer from subjects
  const inferred: string[] = [];
  for (const s of app.subjects ?? []) {
    for (const [key, sk] of Object.entries(SUBJECT_SKILLS)) if (s.name.toLowerCase().includes(key)) inferred.push(...sk);
  }
  if (inferred.length) return inferred;
  return c.split(/[\s,]+/).filter(w => w.length > 3);
}

export function calcSkillsScore(course: string, projectSkills: string[]): { score: number; matched: string[] } {
  if (!projectSkills || projectSkills.length === 0) return { score: 50, matched: [] };
  const inferred: string[] = [];
  const c = course.toLowerCase();
  for (const [key, skills] of Object.entries(COURSE_SKILLS)) {
    if (c.includes(key) || key.split(' ').some(kw => kw.length > 4 && c.includes(kw))) { inferred.push(...skills); break; }
  }
  if (inferred.length === 0) inferred.push(...c.split(/[\s,]+/).filter(w => w.length > 3));
  const matched = projectSkills.filter(skill => {
    const s = skill.toLowerCase();
    return inferred.some(inf => s.includes(inf) || inf.includes(s));
  });
  const ratio = matched.length / projectSkills.length;
  return { score: Math.min(100, Math.round(15 + ratio * 85)), matched };
}

function skillsFor(app: Application, projectSkills: string[]): { score: number; matched: string[] } {
  if (!projectSkills || projectSkills.length === 0) return { score: 50, matched: [] };
  const inferred = inferSkills(app);
  const matched = projectSkills.filter(skill => {
    const s = skill.toLowerCase();
    return inferred.some(inf => s.includes(inf) || inf.includes(s));
  });
  const ratio = matched.length / projectSkills.length;
  return { score: Math.min(100, Math.round(15 + ratio * 85)), matched };
}

/* ── Combined scorer (Discipline 50 · Skills 30 · Standing 20) ─────────── */

export function scoreSuitability(app: Application, project: ProjectEntry): SuitabilityScore {
  const projDisc = project.discipline ?? '';
  const subjectBased = !!(app.subjects && app.subjects.length);

  // Discipline / subject-fit
  let discScore: number;
  if (subjectBased) {
    discScore = calcDisciplineFitFromSubjects(app, projDisc) ?? calcDisciplineScore(app.course, projDisc);
  } else {
    discScore = calcDisciplineScore(app.course, projDisc);
  }

  // Skills
  const { score: sklScore, matched } = skillsFor(app, project.skills ?? []);

  // Standing (within-track band)
  const standing = calcStandingScore(app);
  const standingScore = standing ? standing.score : null;

  // Weighted, renormalised over the factors actually present
  const w = DEFAULT_WEIGHTS;
  const comps: [number, number][] = [[discScore, w.discipline], [sklScore, w.skills]];
  if (standingScore != null) comps.push([standingScore, w.standing]);
  const totalW = comps.reduce((a, [, ww]) => a + ww, 0);
  const score = Math.min(99, Math.max(1, Math.round(comps.reduce((a, [v, ww]) => a + v * ww, 0) / totalW)));

  // Confidence from data completeness
  const confidence: 'High' | 'Medium' | 'Low' =
    standingScore == null ? 'Low'
    : subjectBased && (app.subjects?.length ?? 0) < 3 ? 'Medium'
    : 'High';

  // Reasoning
  let discReason: string;
  if (discScore >= 85)      discReason = `Strong discipline fit with ${projDisc || 'the required discipline'}.`;
  else if (discScore >= 68) discReason = `Good discipline overlap with ${projDisc || 'the project'}.`;
  else if (discScore >= 42) discReason = `Partial discipline relevance to ${projDisc || 'the project'}.`;
  else                      discReason = `Limited discipline alignment with ${projDisc || 'the required discipline'}.`;

  const top3 = matched.slice(0, 3);
  let skillReason: string;
  if (sklScore >= 70)      skillReason = `Strong skills coverage${top3.length ? ` (${top3.join(', ')})` : ''}.`;
  else if (sklScore >= 40) skillReason = `Partial skills coverage${top3.length ? ` (${top3.join(', ')})` : ''}.`;
  else                     skillReason = `Limited overlap with required skills.`;

  const standReason = standing
    ? `Academic standing: ${standing.label}.`
    : `Academic standing not available — the score uses discipline and skills only.`;

  return {
    projectId:       project.id,
    projectTitle:    project.title,
    score,
    reasoning:       `${discReason} ${skillReason} ${standReason}`,
    disciplineScore: discScore,
    skillsScore:     sklScore,
    standingScore:   standingScore ?? undefined,
    confidence,
  };
}

/* ── Live reweighting (renormalised over present components) ──────────── */

export function reweightScore(s: SuitabilityScore, weights: ScoringWeights): number {
  const comps: [number, number][] = [];
  if (s.disciplineScore != null) comps.push([s.disciplineScore, weights.discipline]);
  if (s.skillsScore != null)     comps.push([s.skillsScore, weights.skills]);
  if (s.standingScore != null)   comps.push([s.standingScore, weights.standing]);
  const totalW = comps.reduce((a, [, w]) => a + w, 0);
  if (!comps.length || totalW === 0) return s.score;
  return Math.min(99, Math.max(1, Math.round(comps.reduce((a, [v, w]) => a + v * w, 0) / totalW)));
}

export function reweightedTopScore(app: Application, weights: ScoringWeights): number {
  if (!app.suitabilityScores.length) return 0;
  return Math.max(...app.suitabilityScores.map(s => reweightScore(s, weights)));
}

/* ── Backfill raw components so live re-weighting always works ───────────────
   Hand-authored seed scores often carry only `score` + `reasoning` (no
   disciplineScore / skillsScore / standingScore). Without those raw components
   reweightScore() can't recompute, so the weighting slider becomes a no-op.
   This recomputes the missing components from the applicant + the matching
   project (via scoreSuitability), preserving everything else. Returns the same
   app object when nothing is missing (cheap to call on every render). */
export function backfillScoreComponents(app: Application, projects: ProjectEntry[]): Application {
  const scores = app.suitabilityScores ?? [];
  const needs = scores.some(s => s.disciplineScore == null && s.skillsScore == null && s.standingScore == null);
  if (!needs) return app;
  const projMap = new Map(projects.map(p => [p.id, p]));
  const standing = calcStandingScore(app);
  const next = scores.map(s => {
    if (s.disciplineScore != null || s.skillsScore != null || s.standingScore != null) return s;
    const proj = projMap.get(s.projectId);
    if (proj) {
      const fresh = scoreSuitability(app, proj);
      return { ...s, disciplineScore: fresh.disciplineScore, skillsScore: fresh.skillsScore, standingScore: fresh.standingScore };
    }
    // Project not found — at least surface academic standing so that factor responds.
    return { ...s, standingScore: standing?.score };
  });
  return { ...app, suitabilityScores: next };
}
