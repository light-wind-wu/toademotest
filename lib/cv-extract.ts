import type { Application } from './types';

/* Heuristic leadership / CCA detection over CV (or achievement) text.
   A stand-in for a future LLM — keyword/line matching, no real model. */

const LEADERSHIP_RE = /\b(president|vice[-\s]?president|captain|vice[-\s]?captain|chair(?:person|man)?|head|lead(?:er)?|director|founder|co[-\s]?founder|organising|organizing|exco|committee|secretary|treasurer|mentor|prefect|councillor|councilor)\b/i;

const ACTIVITY_RE = /\b(club|society|cca|council|band|orchestra|choir|guild|union|varsity|hackathon|competition|olympiad|volunteer|community service|ncc|npcc|scouts?|red cross|interact|rotaract|debate|robotics|astronomy|student branch|society of)\b/i;

export function extractHighlights(text: string): { leadership: string[]; activities: string[] } {
  const lines = text
    .split(/[\n\r•·;|]+/)
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 3 && l.length < 160);

  const leadership: string[] = [];
  const activities:  string[] = [];
  for (const l of lines) {
    if (LEADERSHIP_RE.test(l)) {
      if (!leadership.includes(l)) leadership.push(l);
    } else if (ACTIVITY_RE.test(l)) {
      if (!activities.includes(l)) activities.push(l);
    }
  }
  return { leadership: leadership.slice(0, 6), activities: activities.slice(0, 6) };
}

/* Prefer stored highlights (extracted at apply time); else fall back to the
   applicant's listed achievements so older/seed records still surface something. */
export function getCvHighlights(app: Application): { leadership: string[]; activities: string[] } {
  if ((app.cvLeadership?.length ?? 0) > 0 || (app.cvActivities?.length ?? 0) > 0) {
    return { leadership: app.cvLeadership ?? [], activities: app.cvActivities ?? [] };
  }
  return extractHighlights((app.achievements ?? []).join('\n'));
}
