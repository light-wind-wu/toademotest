import type { Application, DSTAEngagementEntry } from './types';
import { getCvHighlights } from './cv-extract';

/* Templated, data-driven CV summary (mock — no real LLM; the UI badges it as AI). */
export function buildCvSummary(app: Application, engagements?: DSTAEngagementEntry[]): string {
  const parts: string[] = [];
  parts.push(`${app.name} is a Year ${app.year} ${app.course} student at ${app.school}${app.gpa > 0 ? ` with a GPA of ${app.gpa.toFixed(2)}` : ''}.`);
  if (app.achievements?.length) {
    parts.push(`Highlights include ${app.achievements.slice(0, 2).join(' and ')}.`);
  }
  // Leadership / CCA detected from the CV
  const { leadership, activities } = getCvHighlights(app);
  if (leadership.length) {
    parts.push(`Shows leadership — ${leadership.slice(0, 2).join('; ')}.`);
  }
  if (activities.length) {
    parts.push(`Active in co-curriculars including ${activities.slice(0, 2).join(' and ')}.`);
  }
  if (engagements?.length) {
    const intern  = engagements.filter(e => e.kind === 'internship').length;
    const courses = engagements.filter(e => e.kind === 'techup-course').length;
    const bits: string[] = [];
    if (intern)  bits.push(`${intern} prior DSTA internship${intern > 1 ? 's' : ''}`);
    if (courses) bits.push(`${courses} TechUp course${courses > 1 ? 's' : ''}`);
    if (bits.length) parts.push(`Has ${bits.join(' and ')} — a sustained track record with DSTA.`);
  }
  const top = [...(app.suitabilityScores ?? [])].sort((a, b) => b.score - a.score)[0];
  if (top?.reasoning) parts.push(top.reasoning);
  return parts.join(' ');
}
