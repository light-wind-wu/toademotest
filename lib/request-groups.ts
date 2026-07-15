/* ─────────────────────────────────────────────────────────────────────────────
   Request grouping — shared by the AD (P&C) submissions inbox and the per-request
   "respond" screen.

   An IO sends a single batch of project requests (one row per Education Level) to
   AD (P&C). They share an upload token (or, for legacy rows, the same sender +
   sent date + deadline). We collapse those rows back into one RequestGroup so the
   AD acts on the request as a whole.
   ──────────────────────────────────────────────────────────────────────────── */
import { toEducationLevel } from './data';
import { parseDurationMonths, toMonthIndex } from './internship-period';
import type { ProjectRequest, ProjectSubmissionBatch, RequestStatus, SubmittedProject } from './types';

export function requestRawCategory(req: ProjectRequest): string {
  return req.internCategory || req.educationLevel;
}

export function requestGroupKey(req: ProjectRequest): string {
  return req.uploadToken || `${req.pc}-${req.sentDate}-${req.deadline}`;
}

export interface RequestGroup {
  key: string;
  requests: ProjectRequest[];
  senderName?: string;
  sentDate: string;
  deadline: string;
}

export function groupRequests(requests: ProjectRequest[]): RequestGroup[] {
  const map = new Map<string, RequestGroup>();
  for (const req of requests) {
    const key = requestGroupKey(req);
    const group = map.get(key);
    if (group) {
      group.requests.push(req);
      if (new Date(req.deadline).getTime() < new Date(group.deadline).getTime()) {
        group.deadline = req.deadline;
      }
      continue;
    }
    map.set(key, {
      key,
      requests: [req],
      senderName: req.senderName,
      sentDate: req.sentDate,
      deadline: req.deadline,
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    || new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime(),
  );
}

/** Roll the per-level statuses up into one status for the whole request. */
export function requestGroupStatus(group: RequestGroup): RequestStatus {
  const statuses = group.requests.map(r => r.status);
  if (statuses.every(s => s === 'matched')) return 'matched';
  if (statuses.some(s => s === 'overdue')) return 'overdue';
  if (statuses.some(s => s === 'excess')) return 'excess';
  if (statuses.some(s => s === 'partial')) return 'partial';
  return 'pending';
}

/** True once the response-deadline day has passed. */
export function deadlinePassed(deadline: string): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  return day < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function isGroupOpen(group: RequestGroup): boolean {
  // A request stays open (awaiting the AD (P&C) response) until its response
  // deadline has passed — it does not close just because placements are filled.
  return !deadlinePassed(group.deadline);
}

function dateOnlyTime(date: string): number | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
}

/** A request closes once its response-deadline day is in the past. */
export function requestDeadlinePassed(deadline: string): boolean {
  const t = dateOnlyTime(deadline);
  if (t === null) return false;
  const now = new Date();
  return t < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function isGroupClosed(group: RequestGroup): boolean {
  return requestDeadlinePassed(group.deadline);
}

export function groupTotals(group: RequestGroup): { placements: number; uploaded: number } {
  return group.requests.reduce(
    (acc, r) => ({ placements: acc.placements + r.placements, uploaded: acc.uploaded + (r.uploaded ?? 0) }),
    { placements: 0, uploaded: 0 },
  );
}

export function findGroup(requests: ProjectRequest[], key: string): RequestGroup | null {
  return groupRequests(requests).find(g => g.key === key) ?? null;
}

/** Days until a deadline (negative once past). */
export function daysLeft(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

/** Projects already submitted against this request, flattened across its batches. */
export function submittedForGroup(
  group: RequestGroup,
  batches: ProjectSubmissionBatch[],
): ProjectSubmissionBatch['projects'] {
  return batches.filter(b => b.uploadToken === group.key).flatMap(b => b.projects);
}

function normalizeText(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function requestPeriodBounds(req: ProjectRequest): { start: number | null; end: number | null } {
  const start = toMonthIndex(req.periodStart);
  const end = toMonthIndex(req.periodEnd);
  if (start !== null || end !== null) return { start, end: end ?? start };

  const parts = (req.calendarPeriod ?? '').split(/\s*[–-]\s*/).map(part => part.trim()).filter(Boolean);
  const periodStart = toMonthIndex(parts[0]);
  const periodEnd = toMonthIndex(parts[1] ?? parts[0]);
  return { start: periodStart, end: periodEnd };
}

function durationMatches(project: SubmittedProject, req: ProjectRequest): boolean {
  const requestDuration = normalizeText(req.duration);
  const projectDuration = normalizeText(project.internshipDuration);
  if (!requestDuration || !projectDuration) return true;
  if (requestDuration === projectDuration) return true;

  const requestMonths = parseDurationMonths(requestDuration);
  const projectMonths = parseDurationMonths(projectDuration);
  const bothMonthBased = requestDuration.includes('month') && projectDuration.includes('month');
  const bothWeekBased = requestDuration.includes('week') && projectDuration.includes('week');
  return (bothMonthBased || bothWeekBased) && requestMonths !== null && requestMonths === projectMonths;
}

export function projectMatchesRequest(project: SubmittedProject, req: ProjectRequest): boolean {
  if (project.requestLineId && req.id) return project.requestLineId === req.id;
  if (toEducationLevel(project.educationLevel ?? '') !== toEducationLevel(requestRawCategory(req))) return false;

  const { start: requestStart, end: requestEnd } = requestPeriodBounds(req);
  const projectStart = toMonthIndex(project.internshipPeriodStart);
  const projectEnd = toMonthIndex(project.internshipPeriodEnd);
  if (requestStart !== null && projectStart !== null && requestStart !== projectStart) return false;
  if (requestEnd !== null && projectEnd !== null && requestEnd !== projectEnd) return false;

  return durationMatches(project, req);
}
